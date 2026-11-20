'use client';
import { useRef, useState } from 'react';
import {
  referralHistory,
  revokeReferral,
  type ReferralHistory,
  referralStatus,
  issueReferral,
} from '@/lib/referral/request';
export function ReferralPreparation() {
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [url, setUrl] = useState(''),
    [notice, setNotice] = useState(''),
    [history, setHistory] = useState<ReferralHistory>(),
    [historyError, setHistoryError] = useState('');
  const issuedId = useRef<string>('');
  const load = async (after?: string) => {
    setHistoryError('');
    try {
      const next = await referralHistory(after);
      setHistory((old) =>
        after && old ? { ...next, links: [...old.links, ...next.links] } : next,
      );
    } catch (e) {
      setHistoryError(
        e instanceof Error ? e.message : '紹介履歴を確認できませんでした。',
      );
    }
  };
  const revoke = async (id: string) => {
    if (
      busy ||
      !confirm(
        'この紹介リンクを取り消しますか？すでに付与済みの特典は取り消されません。',
      )
    )
      return;
    setBusy(true);
    try {
      await revokeReferral(id);
      setHistory((old) =>
        old
          ? {
              ...old,
              links: old.links.map((link) =>
                link.id === id ? { ...link, revoked: true } : link,
              ),
            }
          : old,
      );
      if (id === issuedId.current) setUrl('');
      setNotice('紹介リンクを取り消しました。付与済みの特典はそのままです。');
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : '取消を確認できませんでした。',
      );
    } finally {
      setBusy(false);
    }
  };
  const check = () => {
    void referralStatus()
      .then(setReady)
      .catch(() => setReady(false));
  };
  const issue = async () => {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const created = await issueReferral();
      setUrl(created);
      const token = new URL(created).searchParams.get('referral')!;
      issuedId.current = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(token),
          ),
        ),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
      await load();
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : '紹介リンクを確認できませんでした。',
      );
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    try {
      const native = typeof navigator.share === 'function';
      if (native)
        await navigator.share({ title: 'Camelliaで、自分のための選択を', url });
      else await navigator.clipboard.writeText(url);
      setNotice(
        native
          ? '共有先の画面へ渡しました。'
          : 'リンクをコピーしました。送りたい相手へ貼り付けてください。',
      );
    } catch {
      setNotice('送信を完了していません。リンクは選択してコピーできます。');
    }
  };
  return (
    <details
      className="my-feature-preferences"
      onToggle={(e) => {
        if (e.currentTarget.open) {
          check();
          void load();
        }
      }}
    >
      <summary>{ready ? '紹介とPlus体験' : '紹介とPlus体験（準備中）'}</summary>
      <section className="panel">
        <h2>好きな体験を、誰かに伝える</h2>
        <p>
          {ready
            ? '紹介から新しくCamellia IDを取得した方に、Plusを7日間体験できる特典があります。'
            : '紹介制度はまだ始まっていません。開始後は、新しくCamellia IDを取得した方にPlusの7日間体験を予定しています。'}
          紹介した方はJST暦月3件までMy
          Treeの装飾を選べます。紹介自体の回数に上限はありません。
        </p>
        <p className="meta">
          体験終了後の自動課金はありません。取得した装飾は永久保有で、無料・Plusのどちらでも使えます。自己紹介・重複登録は特典の対象外です。予算・体験のAI枠・期間・特典条件の確認が整ってから開始します。紹介数のランキングや木の成長点は作りません。
        </p>
        {ready && (
          <>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void issue()}
            >
              {busy ? '確認しています…' : '紹介リンクを作る'}
            </button>
            {url && (
              <>
                <label>
                  紹介リンク
                  <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <p className="meta">
                  あなたのCheckや会話・名前は含みません。送り先は自分で選んでください。
                </p>
                <button
                  className="secondary-button"
                  onClick={() => void send()}
                >
                  送り先を選ぶ・コピーする
                </button>
              </>
            )}
          </>
        )}
        <section aria-label="自分の紹介リンク">
          <h3>自分の紹介リンク</h3>
          <p className="meta">
            リンクは作成時だけ表示します。相手の名前や登録情報は表示しません。受付停止中も過去のリンクを取り消せます。
          </p>
          {historyError && (
            <output>
              {historyError}
              <button onClick={() => void load()}>履歴を確認し直す</button>
            </output>
          )}
          {history?.links.length === 0 && (
            <p>作成した紹介リンクはまだありません。</p>
          )}
          {history?.links.map((link, index) => (
            <div key={link.id}>
              <span>
                リンク {index + 1}・
                {link.createdAt === null
                  ? '作成日不明'
                  : new Date(link.createdAt).toLocaleDateString('ja-JP')}
                ・{link.revoked ? '取消済み' : '作成済み'}
              </span>
              {!link.revoked && (
                <button
                  disabled={busy}
                  onClick={() => void revoke(link.id)}
                  aria-label={`紹介リンク${index + 1}を取り消す`}
                >
                  取り消す
                </button>
              )}
            </div>
          ))}
          {history?.nextCursor && (
            <button
              disabled={busy}
              onClick={() => void load(history.nextCursor)}
            >
              以前のリンクを見る
            </button>
          )}
        </section>
        {notice && <output>{notice}</output>}
      </section>
    </details>
  );
}
