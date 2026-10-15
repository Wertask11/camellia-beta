'use client';
import { useEffect, useRef, useState } from 'react';
import { circleRequest } from '@/lib/circle/client';
import {
  GUIDELINES_VERSION,
  REACTIONS,
  REPORT_REASONS,
  type CirclePost,
} from '@/lib/circle/catalog';
import type { AnalyticsEventName } from '@/types';
type Circle = {
  id: string;
  name: string;
  description: string;
  joined: boolean;
};
type Report = {
  id: string;
  reason: string;
  status: string;
  targetId: string;
  text: string;
};
export function CircleScreen({
  onBack,
  onTrack,
}: {
  onBack: () => void;
  onTrack: (
    name: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>,
  ) => void;
}) {
  const [circles, setCircles] = useState<Circle[]>([]),
    [selected, setSelected] = useState<Circle>(),
    [posts, setPosts] = useState<CirclePost[]>([]),
    [comments, setComments] = useState<CirclePost[]>([]),
    [post, setPost] = useState<CirclePost>(),
    [name, setName] = useState(''),
    [accepted, setAccepted] = useState(false),
    [input, setInput] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [moderator, setModerator] = useState(false),
    [reports, setReports] = useState<Report[]>(),
    [edit, setEdit] = useState<{
      item: CirclePost;
      kind: 'post' | 'comment';
    }>(),
    [report, setReport] = useState<{
      item: CirclePost;
      kind: 'post' | 'comment';
    }>();
  const [own, setOwn] =
      useState<Array<CirclePost & { kind: 'post' | 'comment' }>>(),
    [blocks, setBlocks] = useState<string[]>();
  const pending = useRef(false);
  const load = async (
    circle: Circle | null | undefined = selected,
    focus: CirclePost | null | undefined = post,
  ) => {
    if (!circle) {
      const data = await circleRequest();
      setCircles(data.circles);
      setModerator(data.moderator);
      return;
    }
    const data = await circleRequest(
      `?circle=${circle.id}${focus ? `&post=${focus.id}` : ''}`,
    );
    setPosts(data.posts);
    setComments(data.comments);
  };
  useEffect(() => {
    void circleRequest()
      .then((data) => {
        setCircles(data.circles);
        setModerator(data.moderator);
        onTrack('circle_view');
      })
      .catch((e) => setError(e.message));
  }, [onTrack]);
  const run = async (fn: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : '今は利用できません。');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const mutate = async (
    operation: string,
    extra: Record<string, unknown> = {},
  ) => {
    await circleRequest('', { operation, circleId: selected?.id, ...extra });
  };
  const open = (circle: Circle) => {
    setSelected(circle);
    setEdit(undefined);
    setReport(undefined);
    setOwn(undefined);
    setBlocks(undefined);
    setPost(undefined);
    setComments([]);
    setPosts([]);
    setInput('');
    setNotice('');
    if (circle.joined) void run(() => load(circle, null));
  };
  const publish = () =>
    run(async () => {
      if (!selected || !input.trim()) return;
      await mutate(post ? 'comment' : 'post', {
        text: input.trim(),
        ...(post ? { postId: post.id } : {}),
      });
      setInput('');
      onTrack(post ? 'circle_comment_create' : 'circle_post_create', {
        circle_id: selected.id,
      });
      await load();
    });
  const itemView = (item: CirclePost, kind: 'post' | 'comment') => (
    <article className="circle-post" key={item.id}>
      <header>
        <b>{item.displayName}</b>
        <time dateTime={item.createdAt}>
          {new Date(item.createdAt).toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </header>
      <p>{item.text}</p>
      <div className="circle-controls">
        {REACTIONS.map((reaction) => (
          <button
            key={reaction}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await mutate('react', { id: item.id, kind, reaction });
                setNotice('気持ちを届けました。もう一度押すと取り消せます。');
                onTrack('circle_reaction', { circle_id: selected!.id });
              })
            }
          >
            {reaction}
          </button>
        ))}
        {kind === 'post' && (
          <button
            disabled={busy}
            onClick={() => {
              setPost(item);
              setEdit(undefined);
              setInput('');
              void run(() => load(selected, item));
            }}
          >
            コメント
          </button>
        )}
        {item.mine ? (
          <>
            <button
              disabled={busy}
              onClick={() => {
                setEdit({ item, kind });
                setInput(item.text);
              }}
            >
              編集
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!window.confirm('この文章を削除しますか？')) return;
                  await mutate('delete', { id: item.id, kind });
                  if (kind === 'post' && post?.id === item.id)
                    setPost(undefined);
                  await load(selected, kind === 'post' ? null : post);
                })
              }
            >
              削除
            </button>
          </>
        ) : (
          <>
            <button disabled={busy} onClick={() => setReport({ item, kind })}>
              通報
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (
                    !window.confirm(
                      'この人の投稿とコメントを非表示にしますか？相手への通知はありません。',
                    )
                  )
                    return;
                  await mutate('block', { authorId: item.authorId });
                  onTrack('circle_block');
                  if (post?.authorId === item.authorId) setPost(undefined);
                  await load(
                    selected,
                    post?.authorId === item.authorId ? null : post,
                  );
                  setNotice('この人の投稿とコメントを非表示にしました。');
                })
              }
            >
              ブロック
            </button>
          </>
        )}
      </div>
    </article>
  );
  return (
    <main className="screen circle-screen">
      <button
        className="back"
        onClick={() => {
          if (selected) {
            setSelected(undefined);
            setEdit(undefined);
            setReport(undefined);
            setPost(undefined);
            setReports(undefined);
            setInput('');
            void run(() => load(null, null));
          } else onBack();
        }}
      >
        ← {selected ? 'Circle一覧へ' : 'Discoverへ戻る'}
      </button>
      <header>
        <div>
          <p className="eyebrow">安心して、少しつながる</p>
          <h1>{selected?.name ?? 'Circle'}</h1>
        </div>
      </header>
      <details className="circle-guidelines">
        <summary>ここで大切にしたいこと</summary>
        <p>
          助言より、相手の言葉と選択を大切に。返信を急がせず、違う感じ方も尊重してください。
        </p>
        <p>
          誹謗中傷、個人情報の公開、性的嫌がらせ、営業・勧誘・スパム、差別、危険行為、医療デマ、自傷の推奨、他の人への診断は禁止です。緊急の相談はCircleだけで抱えず、専門家や地域の窓口につながってください。
        </p>
        <p>
          投稿は参加者に見え、運営による確認・削除の対象になります。Check・会話・Memory・My
          Treeが自動投稿されることはありません。
        </p>
        <a href="/community-guidelines.html" target="_blank" rel="noopener">
          ガイドライン全文
        </a>
      </details>
      {error && (
        <p role="alert" className="circle-error">
          {error}
        </p>
      )}
      {notice && <output>{notice}</output>}
      {busy && <output aria-label="読み込み中">…</output>}
      {!selected && !reports && (
        <>
          <p className="meta">
            小さな一言から。参加時にCircleだけの表示名を決めます。
          </p>
          {circles.map((circle) => (
            <button
              className="circle-card"
              key={circle.id}
              onClick={() => open(circle)}
            >
              <strong>{circle.name}</strong>
              <span>{circle.description}</span>
              <small>{circle.joined ? '参加中' : 'のぞいてみる'} →</small>
            </button>
          ))}
          <button
            className="text-button"
            onClick={() =>
              void run(async () => {
                setOwn((await circleRequest('?own=1')).own);
                setBlocks(undefined);
              })
            }
          >
            自分の投稿・コメント
          </button>
          <button
            className="text-button"
            onClick={() =>
              void run(async () => {
                setBlocks((await circleRequest('?blocks=1')).blocks);
                setOwn(undefined);
              })
            }
          >
            ブロックの管理
          </button>
          {moderator && (
            <button
              className="text-button"
              onClick={() =>
                void run(async () =>
                  setReports((await circleRequest('?moderation=1')).reports),
                )
              }
            >
              運営：通報を確認する
            </button>
          )}
        </>
      )}
      {own && (
        <section>
          <h2>自分の文章</h2>
          {own.map((item) => (
            <article className="panel" key={item.id}>
              <p>{item.text}</p>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (!window.confirm('削除しますか？')) return;
                    await mutate('delete', { id: item.id, kind: item.kind });
                    setOwn((await circleRequest('?own=1')).own);
                  })
                }
              >
                削除する
              </button>
            </article>
          ))}
          {!own.length && <p>残っている文章はありません。</p>}
          <button onClick={() => setOwn(undefined)}>閉じる</button>
        </section>
      )}
      {blocks && (
        <section>
          <h2>ブロックの管理</h2>
          {blocks.map((authorId, index) => (
            <p key={authorId}>
              非表示にした利用者 {index + 1}
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await mutate('block', { authorId, remove: true });
                    setBlocks((await circleRequest('?blocks=1')).blocks);
                  })
                }
              >
                解除する
              </button>
            </p>
          ))}
          {!blocks.length && <p>ブロックしている利用者はいません。</p>}
          <button onClick={() => setBlocks(undefined)}>閉じる</button>
        </section>
      )}
      {reports && (
        <section>
          <h2>通報の確認</h2>
          {reports.map((item) => (
            <article className="panel" key={item.id}>
              <p>
                {item.reason} · {item.status}
              </p>
              <p>{item.text}</p>
              <p className="meta">対象：{item.targetId}</p>
              {item.status === 'open' && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (!window.confirm('対象を運営削除しますか？')) return;
                      await mutate('moderate', { reportId: item.id });
                      setReports(
                        (await circleRequest('?moderation=1')).reports,
                      );
                    })
                  }
                >
                  運営削除する
                </button>
              )}
            </article>
          ))}
          <button onClick={() => setReports(undefined)}>一覧へ</button>
        </section>
      )}
      {selected && !selected.joined && (
        <section className="panel">
          <p>{selected.description}</p>
          <label>
            Circleだけの表示名（本名は使わないでください）
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
          </label>
          <label className="circle-check">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            ガイドラインを確認し、参加者に投稿が見えることを理解しました
          </label>
          <button
            className="primary"
            disabled={busy || !name.trim() || !accepted}
            onClick={() =>
              void run(async () => {
                await mutate('join', {
                  displayName: name.trim(),
                  guidelinesVersion: GUIDELINES_VERSION,
                });
                const joined = { ...selected, joined: true };
                setSelected(joined);
                setCircles((items) =>
                  items.map((c) => (c.id === joined.id ? joined : c)),
                );
                onTrack('circle_join', { circle_id: selected.id });
                await load(joined, null);
              })
            }
          >
            参加する
          </button>
        </section>
      )}
      {selected?.joined && (
        <>
          {post ? (
            <>
              <button
                className="text-button"
                onClick={() => {
                  setPost(undefined);
                  setEdit(undefined);
                  setReport(undefined);
                  setComments([]);
                  setInput('');
                }}
              >
                ← 投稿一覧へ
              </button>
              {itemView(post, 'post')}
              {comments.map((item) => itemView(item, 'comment'))}
              {!comments.length && (
                <p className="meta">まだコメントはありません。</p>
              )}
            </>
          ) : (
            <>
              {posts.map((item) => itemView(item, 'post'))}
              {!posts.length && (
                <p className="empty">
                  まだ投稿はありません。短い一言からでも。
                </p>
              )}
            </>
          )}
          <section className="circle-composer">
            <label>
              {edit ? '文章を編集' : post ? 'コメントを書く' : '一言を投稿する'}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={500}
                disabled={busy}
              />
            </label>
            <p className="meta">
              本名・連絡先や他の人の個人情報は書かないでください。この欄に入力した文章だけが公開されます。
            </p>
            <button
              className="primary"
              disabled={busy || !input.trim()}
              onClick={() =>
                edit
                  ? void run(async () => {
                      await mutate('edit', {
                        id: edit.item.id,
                        kind: edit.kind,
                        text: input,
                      });
                      if (post?.id === edit.item.id)
                        setPost({ ...post, text: input });
                      setEdit(undefined);
                      setInput('');
                      await load();
                    })
                  : void publish()
              }
            >
              {edit ? '変更を保存' : '投稿する'}
            </button>
            {edit && (
              <button
                onClick={() => {
                  setEdit(undefined);
                  setInput('');
                }}
              >
                編集をやめる
              </button>
            )}
          </section>
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (
                  !window.confirm(
                    'このCircleから退出しますか？投稿は残ります。一覧の「自分の投稿・コメント」から削除できます。',
                  )
                )
                  return;
                await mutate('leave');
                setSelected({ ...selected, joined: false });
                setCircles((items) =>
                  items.map((c) =>
                    c.id === selected.id ? { ...c, joined: false } : c,
                  ),
                );
                setPosts([]);
                setPost(undefined);
                setEdit(undefined);
                setReport(undefined);
                setInput('');
                setComments([]);
                onTrack('circle_leave', { circle_id: selected.id });
              })
            }
          >
            このCircleから退出する
          </button>
        </>
      )}
      {report && (
        <fieldset className="panel circle-report">
          <legend>通報する理由</legend>
          {REPORT_REASONS.map((reason) => (
            <button
              disabled={busy}
              key={reason}
              onClick={() =>
                void run(async () => {
                  await mutate('report', {
                    kind: report.kind,
                    id: report.item.id,
                    reason,
                  });
                  setReport(undefined);
                  setNotice(
                    '通報を受け付けました。相手に通報者は通知しません。',
                  );
                  onTrack('circle_report', { circle_id: selected!.id });
                })
              }
            >
              {reason}
            </button>
          ))}
          <button onClick={() => setReport(undefined)}>やめる</button>
        </fieldset>
      )}
    </main>
  );
}
