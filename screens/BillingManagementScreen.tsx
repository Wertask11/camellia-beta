'use client';
import { useEffect, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import { finishAuthCallback, startLineLogin } from '@/lib/auth/camellia';
import {
  emailIdService,
  emailIdError,
  stripEmailCallback,
} from '@/lib/auth/email-id';
import { resetAnalyticsIdentity } from '@/lib/analytics/posthog';
import { armBillingLogin, clearBillingLogin } from '@/lib/billing/intent';
import {
  billingHistory,
  billingRequest,
  billingRedirect,
  stopPaymentAnalytics,
  type BillingStatus,
  type BillingInvoice,
} from '@/lib/billing/client';

/** Auth only: no consumer profile, invite, data handover or subscription purchase is required. */
export function BillingManagementScreen() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [email, setEmail] = useState(''),
    [sent, setSent] = useState(false),
    [link, setLink] = useState(''),
    [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
      uid: string;
      status?: BillingStatus;
      invoices: BillingInvoice[];
      more: boolean;
      historyError: boolean;
    }>(),
    [analyticsStopped, setAnalyticsStopped] = useState(false);
  const started = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(
    () =>
      onAuthStateChanged(schoolParkAuth, (u) => {
        setUser(u);
        setResult(undefined);
        setAnalyticsStopped(false);
      }),
    [],
  );
  const complete = async (url: string, address?: string) => {
    setBusy(true);
    setError('');
    try {
      await emailIdService().complete(url, address, false, 'billing');
      if (alive.current) {
        setLink('');
        setSent(false);
        clearBillingLogin();
      }
    } catch (e) {
      if (alive.current) setError(emailIdError(e));
    } finally {
      if (alive.current) {
        setBusy(false);
        setReady(true);
      }
    }
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const original = location.href;
    queueMicrotask(() => {
      if (!alive.current) return;
      try {
        const url = new URL(original),
          isEmail = emailIdService().isLink(original);
        history.replaceState({}, '', stripEmailCallback(url));
        if (isEmail) {
          setLink(original);
          const pending = emailIdService().pending();
          if (pending) {
            setEmail(pending.email);
            void complete(original);
          } else setReady(true);
          return;
        }
        void finishAuthCallback()
          .catch(() => {
            if (alive.current)
              setError(
                '本人確認を完了できませんでした。支払いに使った方法で、もう一度お試しください。',
              );
          })
          .finally(() => {
            clearBillingLogin();
            if (alive.current) {
              const next = new URL(location.href);
              next.searchParams.set('open', 'billing');
              history.replaceState({}, '', next.pathname + next.search);
              setReady(true);
            }
          });
      } catch {
        setError(
          '本人確認を開始できませんでした。再読み込みしてお試しください。',
        );
        setReady(true);
      }
    });
  }, []);
  useEffect(() => {
    if (!ready || !user || user.isAnonymous || link) return;
    let active = true;
    const uid = user.uid;
    void Promise.allSettled([
      billingRequest('status'),
      billingRequest('history'),
    ]).then(([status, history]) => {
      if (!active || schoolParkAuth.currentUser?.uid !== uid) return;
      let records: { invoices: BillingInvoice[]; more: boolean } = {
        invoices: [],
        more: false,
      };
      let historyError = history.status === 'rejected';
      if (history.status === 'fulfilled')
        try {
          records = billingHistory(history.value);
        } catch {
          historyError = true;
        }
      setResult({
        uid,
        ...(status.status === 'fulfilled'
          ? { status: status.value as BillingStatus }
          : {}),
        ...records,
        historyError,
      });
      if (status.status === 'rejected' || historyError)
        setError(
          '支払い情報の一部を確認できませんでした。購入し直さず、もう一度確認してください。',
        );
    });
    return () => {
      active = false;
    };
  }, [ready, user, link, revision]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : '手続きを確認できませんでした。',
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const signedIn = Boolean(user && !user.isAnonymous),
    own = result?.uid === user?.uid ? result : undefined;
  return (
    <main className="app-shell">
      <section className="screen identity-screen">
        <p className="eyebrow">Camellia Plus</p>
        <h1>支払い履歴・解約</h1>
        <p>
          支払いに使ったCamellia
          IDで確認できます。記録を削除した後や、プロフィール入力・利用再開の前でも開けます。
        </p>
        {!ready ? (
          <output>本人確認の状態を確認しています…</output>
        ) : link || !signedIn ? (
          <>
            <p className="meta">
              以前と同じメール・LINE・Googleをご利用ください。別の方法で新しいIDに入っても、支払いを自動で結び付けません。
            </p>
            {sent && !link ? (
              <section className="panel" aria-live="polite">
                <h2>確認メールの送信を受け付けました</h2>
                <p>
                  メールのリンクを開いてください。端末内の記録はそのまま残ります。
                </p>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => setSent(false)}
                >
                  メールアドレスを確認する
                </button>
              </section>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (link) void complete(link, email);
                  else
                    void run(async () => {
                      try {
                        await emailIdService().request(
                          email,
                          location.origin,
                          'signin',
                          false,
                          'billing',
                        );
                        setSent(true);
                      } catch (e) {
                        throw new Error(emailIdError(e));
                      }
                    });
                }}
              >
                <label>
                  支払いに使ったメールアドレス
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    value={email}
                    disabled={busy}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <button className="primary" disabled={busy || !email.trim()}>
                  {busy
                    ? '確認しています…'
                    : link
                      ? 'メールを確認して支払い管理を開く'
                      : '支払い管理の確認メールを受け取る'}
                </button>
              </form>
            )}
            {!link && (
              <>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      armBillingLogin();
                      try {
                        startLineLogin();
                      } catch {
                        clearBillingLogin();
                        throw new Error(
                          'LINEでの確認を開始できませんでした。もう一度お試しください。',
                        );
                      }
                    })
                  }
                >
                  LINEで支払い管理を開く
                </button>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const p = new GoogleAuthProvider();
                      p.setCustomParameters({ prompt: 'select_account' });
                      try {
                        await signInWithPopup(schoolParkAuth, p);
                      } catch {
                        throw new Error(
                          'Googleでの確認を完了できませんでした。もう一度お試しください。',
                        );
                      }
                    })
                  }
                >
                  Googleで支払い管理を開く
                </button>
              </>
            )}
          </>
        ) : (
          <>
            {!own ? (
              <output>支払い情報を確認しています…</output>
            ) : (
              <>
                {own.status?.customer || own.invoices.length > 0 ? (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const v = await billingRequest('portal');
                        billingRedirect(v.url, 'billing.stripe.com');
                      })
                    }
                  >
                    支払い方法・解約を確認する
                  </button>
                ) : (
                  own.status &&
                  !own.historyError && (
                    <output>
                      このIDに紐づく支払いは確認されていません。別のIDで申し込んだ場合は、ログアウトして以前の方法でお入りください。
                    </output>
                  )
                )}
                <h2>最近の支払い</h2>
                {own.historyError ? (
                  <p>履歴を取得できませんでした。空の履歴として扱いません。</p>
                ) : own.invoices.length ? (
                  <ul>
                    {own.invoices.map((v, i) => (
                      <li key={i}>
                        {new Date(v.createdAt).toLocaleDateString('ja-JP', {
                          timeZone: 'Asia/Tokyo',
                        })}{' '}
                        ·{' '}
                        {v.status === 'paid'
                          ? '支払い済み'
                          : v.status === 'open'
                            ? '支払い待ち'
                            : v.status === 'void'
                              ? '無効'
                              : v.status === 'uncollectible'
                                ? '未回収'
                                : v.status === 'draft'
                                  ? '下書き'
                                  : '状態を確認中'}{' '}
                        ·{' '}
                        {v.amountPaidYen === null
                          ? '円以外の支払い'
                          : `${v.amountPaidYen.toLocaleString('ja-JP')}円の支払い`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>表示できる支払い履歴はありません。</p>
                )}
                {own.more && (
                  <p className="meta">
                    以前の履歴は、上の支払い管理から確認できます。
                  </p>
                )}
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => {
                    setError('');
                    setRevision((v) => v + 1);
                  }}
                >
                  支払い情報をもう一度確認する
                </button>
                <details>
                  <summary>支払い完了の計測</summary>
                  <p className="meta">
                    今後の送信を止めても、支払い・Plus・解約には影響しません。送信処理中・送信済みのイベントは回収できません。
                  </p>
                  {analyticsStopped ? (
                    <output>計測を停止しました。</output>
                  ) : (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const uid = user?.uid;
                          await stopPaymentAnalytics();
                          if (schoolParkAuth.currentUser?.uid === uid)
                            setAnalyticsStopped(true);
                        })
                      }
                    >
                      支払い完了の計測を止める
                    </button>
                  )}
                </details>
              </>
            )}
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await signOut(schoolParkAuth);
                  resetAnalyticsIdentity({ clearPending: false });
                  setSent(false);
                })
              }
            >
              支払い管理からログアウト
            </button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <p>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => location.assign('/billing.html')}
          >
            料金・解約・返金と販売者情報
          </button>
        </p>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => {
            clearBillingLogin();
            location.assign('/');
          }}
        >
          Camelliaへ戻る
        </button>
      </section>
    </main>
  );
}
