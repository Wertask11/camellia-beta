'use client';
import { useState } from 'react';
import { issueReferralLink, referralLinksReady } from '@/lib/referral/client';

function referralError(code: string) {
  if (code === 'SLOW_DOWN') return '少し時間をおいてから、もう一度お試しください。';
  if (code === 'PROFILE_REQUIRED' || code === 'LOGIN_REQUIRED' || code === 'INVITE_REQUIRED')
    return '招待リンクを作るには、Camellia IDでのログインと最初の登録が必要です。';
  return 'いまは招待リンクを作れませんでした。時間をおいてお試しください。';
}

function ReferralLink() {
  const [link, setLink] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setLink(await issueReferralLink());
    } catch (e) {
      setError(referralError(e instanceof Error ? e.message : ''));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setNotice('リンクをコピーしました。');
    } catch {
      setNotice('コピーできませんでした。リンクを長押しして選んでください。');
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: 'Camellia', text: '今日の自分に合う選択肢を見つけるCamelliaに招待します。', url: link });
    } catch {
      /* The person closed the share sheet; the link stays on screen. */
    }
  };
  return (
    <details className="my-feature-preferences">
      <summary>友だちを招待する</summary>
      <section className="panel referral-panel">
        <h2>好きな体験を、誰かに伝える</h2>
        <p>
          招待リンクから新しく登録した方は、Plusを7日間無料で試せます。招待した方には、My
          Treeの飾り「椿の花」がつきます（飾りは1か月に3件まで）。
        </p>
        <p className="meta">
          体験が終わっても自動で課金されることはありません。リンクには名前や記録は含まれません。紹介数のランキングはありません。
        </p>
        {error && <p role="alert">{error}</p>}
        {link ? (
          <>
            <output className="referral-link">{link}</output>
            <div className="referral-actions">
              <button className="secondary-button" onClick={() => void copy()}>リンクをコピー</button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button className="secondary-button" onClick={() => void share()}>共有する</button>
              )}
            </div>
            {notice && <p className="meta" aria-live="polite">{notice}</p>}
          </>
        ) : (
          <button className="primary" disabled={busy} onClick={() => void create()}>
            {busy ? '作っています…' : '招待リンクを作る'}
          </button>
        )}
      </section>
    </details>
  );
}

export function ReferralPreparation() {
  if (referralLinksReady) return <ReferralLink />;
  return (
    <details className="my-feature-preferences">
      <summary>紹介とPlus体験（準備中）</summary>
      <section className="panel">
        <h2>好きな体験を、誰かに伝える</h2>
        <p>
          紹介制度はまだ始まっていません。開始後は、紹介から新しく登録した方にPlusの7日間体験、紹介した方には月3件までMy
          Treeの装飾を選べる特典を予定しています。
        </p>
        <p className="meta">
          体験終了後の自動課金はありません。装飾は一度選ぶと保持でき、Freeでも使える方針です。装飾のデザイン・体験のAI枠・開始条件は確認中です。紹介数のランキングや木の成長点は作りません。今は紹介リンクを発行しません。
        </p>
      </section>
    </details>
  );
}
