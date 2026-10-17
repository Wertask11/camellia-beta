'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { circleRequest } from '@/lib/circle/client';
import { watchCircleUpdates } from '@/lib/circle/updates';
import {
  GUIDELINES_VERSION,
  REACTIONS,
  REPORT_REASONS,
  type CirclePost,
  type CircleSummary,
  type CircleReport,
  type CircleAudit,
} from '@/lib/circle/catalog';
import type { AnalyticsEventName } from '@/types';
type Circle = CircleSummary;
type Report = CircleReport;
export function CircleScreen({
  onBack,
  onTrack,
  initialCircleId,
  initialJoinedOnly = false,
  onCircleChange,
}: {
  initialCircleId?: string;
  initialJoinedOnly?: boolean;
  onCircleChange?: (id?: string) => void;
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
  const [next, setNext] = useState<string>();
  const [nextOwn, setNextOwn] = useState<string>();
  const [nextReports, setNextReports] = useState<string>();
  const [nextAudit, setNextAudit] = useState<string>();
  const [audits, setAudits] = useState<CircleAudit[]>();
  const [ownKind, setOwnKind] = useState<'post' | 'comment'>('post');
  const [joinedOnly, setJoinedOnly] = useState(initialJoinedOnly);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [share, setShare] = useState('');
  const [ownLoaded, setOwnLoaded] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [feedMissing, setFeedMissing] = useState(false);
  const ownHeading = useRef<HTMLHeadingElement>(null);
  const showingOwn = own !== undefined;
  useEffect(() => {
    if (showingOwn) ownHeading.current?.focus();
  }, [showingOwn]);
  const feedVersion = useRef<number | undefined>(undefined);
  const loadedPages = useRef(1);
  const requestEpoch = useRef(0);
  const initialOpened = useRef(false);
  const reportPanel = useRef<HTMLFieldSetElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (report) {
      reportPanel.current?.scrollIntoView({ block: 'center' });
      reportPanel.current?.querySelector('button')?.focus();
    }
  }, [report]);
  useEffect(() => {
    if (edit) composer.current?.focus();
  }, [edit]);
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
    setNext(data.nextCursor);
    feedVersion.current = data.version;
    loadedPages.current = 1;
    setFeedMissing(false);
    setLiveError('');
    if (focus) setPost(data.posts[0]);
  };
  useEffect(() => {
    void circleRequest()
      .then((data) => {
        setCircles(data.circles);
        setModerator(data.moderator);
        if (!initialOpened.current) {
          initialOpened.current = true;
          onTrack('circle_view');
          const target = data.circles.find((c) => c.id === initialCircleId);
          if (target) {
            setSelected(target);
            onTrack('circle_view', {
              circle_id: target.id,
              ...(target.joined && target.daysSinceJoin !== undefined
                ? { days_since_join: target.daysSinceJoin }
                : {}),
            });
            if (target.joined)
              void circleRequest(`?circle=${target.id}`)
                .then((result) => {
                  setPosts(result.posts);
                  setComments(result.comments);
                  setNext(result.nextCursor);
                  feedVersion.current = result.version;
                })
                .catch((e) => setError(e.message));
          }
        }
      })
      .catch((e) => setError(e.message));
  }, [onTrack, initialCircleId]);
  const run = useCallback(async (fn: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    const epoch = ++requestEpoch.current;
    setBusy(true);
    setError('');
    setNotice('');
    setLiveError('');
    try {
      await fn();
    } catch (e) {
      if (epoch === requestEpoch.current)
        setError(e instanceof Error ? e.message : '今は利用できません。');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, []);
  const mutate = async (
    operation: string,
    extra: Record<string, unknown> = {},
  ) => {
    await circleRequest('', { operation, circleId: selected?.id, ...extra });
  };
  const open = (circle: Circle) => {
    setSelected(circle);
    onCircleChange?.(circle.id);
    onTrack('circle_view', {
      circle_id: circle.id,
      ...(circle.joined && circle.daysSinceJoin !== undefined
        ? { days_since_join: circle.daysSinceJoin }
        : {}),
    });
    setNext(undefined);
    setNextOwn(undefined);
    setNextReports(undefined);
    setNextAudit(undefined);
    setShare('');
    setAccepted(false);
    setName('');
    setAudits(undefined);
    setEdit(undefined);
    setReport(undefined);
    setOwn(undefined);
    setBlocks(undefined);
    setPost(undefined);
    setComments([]);
    setPosts([]);
    setFeedMissing(false);
    feedVersion.current = undefined;
    loadedPages.current = 1;
    setInput('');
    setNotice('');
    if (circle.joined) void run(() => load(circle, null));
  };
  const more = () =>
    run(async () => {
      if (!selected || !next) return;
      const data = await circleRequest(
        `?circle=${selected.id}${post ? `&post=${post.id}` : ''}&cursor=${encodeURIComponent(next)}`,
      );
      if (post)
        setComments((items) => [
          ...items,
          ...data.comments.filter(
            (item) => !items.some((previous) => previous.id === item.id),
          ),
        ]);
      else
        setPosts((items) => [
          ...items,
          ...data.posts.filter(
            (item) => !items.some((previous) => previous.id === item.id),
          ),
        ]);
      setNext(data.nextCursor);
      loadedPages.current++;
    });
  const loadOwn = async (kind: 'post' | 'comment', cursor?: string) => {
    const epoch = requestEpoch.current;
    setOwnKind(kind);
    if (!cursor) {
      setOwn([]);
      setOwnLoaded(false);
      setNextOwn(undefined);
    }
    const data = await circleRequest(
      `?own=1&kind=${kind}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    if (epoch !== requestEpoch.current) return;
    setOwn((items) => (cursor ? [...(items ?? []), ...data.own] : data.own));
    setOwnKind(kind);
    setOwnLoaded(true);
    setNextOwn(data.nextOwnCursor);
  };
  const loadReports = async (cursor?: string) => {
    const data = await circleRequest(
      `?moderation=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    setReports((items) =>
      cursor ? [...(items ?? []), ...data.reports] : data.reports,
    );
    setNextReports(data.nextReportCursor);
    setAudits(undefined);
  };
  const loadAudit = async (cursor?: string) => {
    const data = await circleRequest(
      `?audit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    setAudits((items) =>
      cursor ? [...(items ?? []), ...data.audits] : data.audits,
    );
    setNextAudit(data.nextAuditCursor);
    setReports(undefined);
  };
  const reload = () => run(async () => {
    if (own !== undefined) return loadOwn(ownKind);
    if (blocks !== undefined) {
      setBlocks((await circleRequest('?blocks=1')).blocks);
      return;
    }
    if (reports !== undefined) return loadReports();
    if (audits !== undefined) return loadAudit();
    await load();
  });
  const liveState = useRef({ selected, post, next, paused: false });
  useLayoutEffect(() => {
    liveState.current = { selected, post, next, paused: Boolean(edit || report || feedMissing) };
  }, [selected, post, next, edit, report, feedMissing]);
  useEffect(() => {
    if (!selected?.joined) return;
    let cancelled = false;
    const active = () => !cancelled && document.visibilityState === 'visible' && !pending.current && !liveState.current.paused
      && liveState.current.selected?.id === selected.id && liveState.current.post?.id === post?.id;
    const watcher = watchCircleUpdates({
      active,
      currentVersion: () => feedVersion.current,
      readVersion: async () => (await circleRequest(`?circle=${selected.id}&version=1`)).version,
      refresh: async () => {
        const epoch = requestEpoch.current;
        const current = liveState.current;
        const query = `?circle=${selected.id}${current.post ? `&post=${current.post.id}` : ''}`;
        const pages = loadedPages.current + (current.next ? 0 : 1);
        let cursor: string | undefined;
        let result;
        let version: number | undefined;
        let pageCount = 0;
        const refreshedPosts: CirclePost[] = [];
        const refreshedComments: CirclePost[] = [];
        do {
          result = await circleRequest(`${query}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
          if (!active() || epoch !== requestEpoch.current) return;
          version ??= result.version;
          if (!current.post || !pageCount) refreshedPosts.push(...result.posts);
          refreshedComments.push(...result.comments);
          cursor = result.nextCursor;
          pageCount++;
        } while (cursor && pageCount < pages);
        if (!active() || epoch !== requestEpoch.current) return;
        setPosts(refreshedPosts);
        setComments(refreshedComments);
        setNext(cursor);
        if (current.post) setPost(refreshedPosts[0]);
        loadedPages.current = pageCount;
        feedVersion.current = version;
        setLiveError('');
      },
      onError: (failure) => {
        if (failure && typeof failure === 'object' && 'code' in failure && failure.code === 'NOT_FOUND') {
          setFeedMissing(true);
          setPosts([]);
          setComments([]);
          setLiveError('この文章は削除されたか、今は表示できません。投稿一覧へ戻って確認してください。');
        } else setLiveError('新しい投稿やコメントを確認できませんでした。');
      },
    });
    const resume = () => { if (document.visibilityState === 'visible') watcher.refresh(); };
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      cancelled = true;
      watcher.stop();
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [selected?.id, selected?.joined, post?.id]);
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
            aria-pressed={item.myReaction === reaction}
            disabled={busy}
            onClick={() =>
              // oxlint-disable-next-line react-compiler -- run reads request guards only when this click handler executes; itemView itself does not invoke it during render.
              void run(async () => {
                const result = await circleRequest('', {
                  operation: 'react',
                  circleId: selected?.id,
                  id: item.id,
                  kind,
                  reaction,
                });
                const update = (values: CirclePost[]) =>
                  values.map((value) =>
                    value.id === item.id
                      ? { ...value, myReaction: result.reaction }
                      : value,
                  );
                setPosts(update);
                setComments(update);
                setPost((value) =>
                  value?.id === item.id
                    ? { ...value, myReaction: result.reaction }
                    : value,
                );
                setNotice(
                  result.reaction
                    ? '気持ちを届けました。もう一度押すと取り消せます。'
                    : 'リアクションを取り消しました。',
                );
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
              // oxlint-disable-next-line react-compiler -- this guarded feed request executes on a click, outside itemView's render.
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
          if (own !== undefined || blocks !== undefined) {
            requestEpoch.current++;
            setOwn(undefined);
            setBlocks(undefined);
            setError('');
            return;
          }
          if (selected) {
            setSelected(undefined);
            onCircleChange?.();
            setNext(undefined);
            setShare('');
            setEdit(undefined);
            setReport(undefined);
            setPost(undefined);
            setReports(undefined);
            setInput('');
            void run(() => load(null, null));
          } else onBack();
        }}
      >
        ← {selected || own !== undefined || blocks !== undefined ? 'Circle一覧へ' : 'Discoverへ戻る'}
      </button>
      <header>
        <div>
          <p className="eyebrow">安心して、少しつながる</p>
          <h1>{own !== undefined ? '自分の投稿・コメント' : selected?.name ?? 'Circle'}</h1>
        </div>
      </header>
      {selected && (
        <>
          <p>{selected.description}</p>
          <p className="meta">{selected.memberCount}人が参加しています</p>
          <button
            className="text-button"
            onClick={() => {
              const url = new URL('/', location.origin);
              url.searchParams.set('open', 'circle');
              url.searchParams.set('circle', selected.id);
              setShare(url.toString());
            }}
          >
            このCircleを紹介する
          </button>
          {share && (
            <label>
              共有URL
              <input
                readOnly
                value={share}
                onFocus={(event) => event.target.select()}
              />
            </label>
          )}
        </>
      )}
      <details className="circle-guidelines">
        <summary>ここで大切にしたいこと</summary>
        <p>
          助言より、相手の言葉と選択を大切に。返信を急がせず、違う感じ方も尊重してください。
        </p>
        <p>
          相手の状態を決めつけず、誹謗中傷、個人情報の公開、性的嫌がらせ、執拗な出会い目的の接触、営業・宗教・投資等の勧誘、スパム、差別、危険・違法行為、医療デマ、自傷の推奨、他の人への診断は禁止です。緊急の相談はCircleだけで抱えず、専門家や地域の窓口につながってください。
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
          <button disabled={busy} onClick={() => void reload()}>
            もう一度読み込む
          </button>
        </p>
      )}
      {liveError && <output className="circle-error">{liveError}<button disabled={busy} onClick={() => void reload()}>もう一度読み込む</button></output>}
      {notice && <output>{notice}</output>}
      {busy && <output aria-label="読み込み中">…</output>}
      {!selected && !reports && !audits && own === undefined && blocks === undefined && (
        <>
          <p className="meta">
            小さな一言から。参加時にCircleだけの表示名を決めます。
          </p>
          <div className="circle-filters">
            <button
              aria-pressed={!joinedOnly}
              onClick={() => setJoinedOnly(false)}
            >
              すべて
            </button>
            <button
              aria-pressed={joinedOnly}
              onClick={() => setJoinedOnly(true)}
            >
              参加中
            </button>
          </div>
          {joinedOnly && !circles.some((c) => c.joined) && (
            <p className="empty">参加中のCircleはまだありません。</p>
          )}
          {circles
            .filter((c) => !joinedOnly || c.joined)
            .map((circle) => (
              <button
                className="circle-card"
                key={circle.id}
                onClick={() => open(circle)}
              >
                <strong>{circle.name}</strong>
                <span>{circle.description}</span>
                <small>
                  {circle.memberCount}人 ·{' '}
                  {circle.joined ? '参加中' : '詳しく見る'} →
                </small>
              </button>
            ))}
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                setBlocks(undefined);
                await loadOwn(ownKind);
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
              onClick={() => void run(async () => loadReports())}
            >
              運営：通報を確認する
            </button>
          )}
        </>
      )}
      {own && (
        <section>
          <h2 ref={ownHeading} tabIndex={-1}>自分の文章</h2>
          <div className="circle-filters">
            <button
              disabled={busy}
              aria-pressed={ownKind === 'post'}
              onClick={() => void run(() => loadOwn('post'))}
            >
              投稿
            </button>
            <button
              disabled={busy}
              aria-pressed={ownKind === 'comment'}
              onClick={() => void run(() => loadOwn('comment'))}
            >
              コメント
            </button>
          </div>
          {own.map((item) => (
            <article className="panel" key={item.id}>
              <p>{item.text}</p>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (!window.confirm('削除しますか？')) return;
                    await mutate('delete', { id: item.id, kind: item.kind });
                    await loadOwn(ownKind);
                  })
                }
              >
                削除する
              </button>
            </article>
          ))}
          {nextOwn && (
            <button
              disabled={busy}
              onClick={() => void run(() => loadOwn(ownKind, nextOwn))}
            >
              さらに読み込む
            </button>
          )}
          {!own.length && ownLoaded && !busy && !error && <p>残っている文章はありません。</p>}
          <button onClick={() => { requestEpoch.current++; setOwn(undefined); setError(''); }}>閉じる</button>
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
          <p className="meta">
            通報者は表示しません。判断と対応メモは運営記録に残ります。
          </p>
          <button disabled={busy} onClick={() => void run(() => loadAudit())}>
            対応履歴
          </button>
          {!reports.length && <p>未対応の通報はありません。</p>}
          {reports.map((item) => (
            <article className="panel" key={item.id}>
              <p>
                {item.reason} ·{' '}
                {item.targetKind === 'post' ? '投稿' : 'コメント'}
              </p>
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString('ja-JP', {
                  timeZone: 'Asia/Tokyo',
                })}
              </time>
              <p>{item.text || '本文は削除されています。'}</p>
              <p className="meta">
                投稿者の公開ID：{item.authorId} / 対象：{item.targetId}
              </p>
              <label>
                対応メモ（運営のみ・任意）
                <textarea
                  maxLength={200}
                  value={reviewNotes[item.id] ?? ''}
                  onChange={(event) =>
                    setReviewNotes((notes) => ({
                      ...notes,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </label>
              {(['dismiss', 'remove'] as const).map((action) => (
                <button
                  key={action}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (
                        !window.confirm(
                          action === 'remove'
                            ? '対象の文章を削除して対応記録に残しますか？'
                            : '本文を残し、対応済みとして記録しますか？',
                        )
                      )
                        return;
                      await mutate('moderate', {
                        reportId: item.id,
                        action,
                        note: reviewNotes[item.id] ?? '',
                      });
                      await loadReports();
                      setNotice('対応を記録しました。');
                    })
                  }
                >
                  {action === 'dismiss'
                    ? '削除せず対応済みにする'
                    : '文章を運営削除する'}
                </button>
              ))}
            </article>
          ))}
          {nextReports && (
            <button
              disabled={busy}
              onClick={() => void run(() => loadReports(nextReports))}
            >
              次の通報を読む
            </button>
          )}
          <button onClick={() => setReports(undefined)}>Circle一覧へ</button>
        </section>
      )}
      {audits && (
        <section>
          <h2>運営の対応履歴</h2>
          {audits.map((item) => (
            <article className="panel" key={item.id}>
              <p>
                {item.action === 'dismiss' ? '削除せず対応済み' : '文章を削除'}{' '}
                ·{' '}
                {new Date(item.createdAt).toLocaleString('ja-JP', {
                  timeZone: 'Asia/Tokyo',
                })}
              </p>
              <p>{item.note || '対応メモなし'}</p>
              <p className="meta">
                対象：{item.targetId}
                <br />
                投稿者の公開ID：{item.authorId}
                <br />
                担当者の公開ID：{item.moderatorId}
              </p>
            </article>
          ))}
          {!audits.length && <p>対応履歴はありません。</p>}
          {nextAudit && (
            <button
              disabled={busy}
              onClick={() => void run(() => loadAudit(nextAudit))}
            >
              さらに履歴を読む
            </button>
          )}
          <button disabled={busy} onClick={() => void run(() => loadReports())}>
            通報へ戻る
          </button>
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
                  void run(() => load(selected, null));
                }}
              >
                ← 投稿一覧へ
              </button>
              {!feedMissing && itemView(post, 'post')}
              {comments.map((item) => itemView(item, 'comment'))}
              {!comments.length && !error && !busy && !feedMissing && (
                <p className="meta">まだコメントはありません。</p>
              )}
            </>
          ) : (
            <>
              {posts.map((item) => itemView(item, 'post'))}
              {!posts.length && !error && !busy && (
                <p className="empty">
                  まだ投稿はありません。短い一言からでも。
                </p>
              )}
            </>
          )}
          {next && (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void more()}
            >
              さらに{post ? 'コメント' : '投稿'}を読む
            </button>
          )}
          <section className="circle-composer">
            <label>
              {edit ? '文章を編集' : post ? 'コメントを書く' : '一言を投稿する'}
              <textarea
                ref={composer}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={500}
                disabled={busy}
              />
            </label>
            <p className="meta">{Array.from(input).length} / 500文字</p>
            <p className="meta">
              本名・連絡先や他の人の個人情報は書かないでください。この欄に入力した文章だけが公開されます。
            </p>
            <button
              className="primary"
              disabled={busy || feedMissing || !input.trim() || Array.from(input).length > 500}
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
        <fieldset ref={reportPanel} className="panel circle-report">
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
