'use client';

import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import { captureAuthEvent } from '@/lib/analytics/posthog';
import { getLinkedCamelliaMethods, logoutCamellia, startLineLogin, startSchoolParkLogin, type LinkedCamelliaMethods } from '@/lib/auth/camellia';

export function AccountSettings({ distinctId }: { distinctId: string }) {
  const [user, setUser] = useState<User | null>(schoolParkAuth.currentUser);
  const [linked, setLinked] = useState<LinkedCamelliaMethods | null>(null);
  const [unknown, setUnknown] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [googleOnly, setGoogleOnly] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(schoolParkAuth, async (next) => {
    setUser(next);
    setLinked(null);
    setUnknown(false);
    setGoogleLinked(Boolean(next?.providerData.some((item) => item.providerId === GoogleAuthProvider.PROVIDER_ID)));
    if (!next || next.isAnonymous) {
      setGoogleOnly(false);
      return;
    }
    const token = await next.getIdTokenResult().catch(() => null);
    setGoogleOnly(token?.claims.camellia !== true && next.providerData.some((item) => item.providerId === GoogleAuthProvider.PROVIDER_ID));
    getLinkedCamelliaMethods().then(setLinked).catch(() => setUnknown(true));
  }), []);

  const connect = (method: 'line' | 'schoolpark') => {
    setError('');
    if (googleOnly) {
      setError('Googleだけで作成したアカウントへのLINE / SchoolPark連携は、現在未対応です。記録を分けないため、同じGoogleアカウントでお使いください。');
      return;
    }
    try {
      captureAuthEvent('account_link_started', { auth_method: method }, distinctId);
      if (method === 'line') startLineLogin();
      else startSchoolParkLogin();
    } catch {
      setError('うまくつながりませんでした。もう一度試してください。');
    }
  };

  const connectGoogle = async () => {
    if (!user) return;
    setError('');
    setBusy(true);
    captureAuthEvent('account_link_started', { auth_method: 'google' }, distinctId);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await linkWithPopup(user, provider);
      setUser(result.user);
      setGoogleLinked(true);
      captureAuthEvent('account_link_success', { auth_method: 'google' }, distinctId);
    } catch (cause) {
      const code = typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : '';
      if (code === 'auth/credential-already-in-use' || code === 'auth/account-exists-with-different-credential' || code === 'auth/email-already-in-use') {
        setError('このGoogleアカウントは別のCamelliaアカウントで使われています。データは自動で統合していません。以前使ったアカウントでログインしてください。');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Google連携をキャンセルしました。');
      } else if (code === 'auth/popup-blocked') {
        setError('ポップアップがブロックされました。このサイトのポップアップを許可して再度お試しください。');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Google連携は現在準備中です。');
      } else {
        setError('Googleを連携できませんでした。通信を確認して再度お試しください。');
      }
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    try {
      await logoutCamellia();
      setError('ログアウトしました。保存済みデータはこの端末に残っています。');
    } catch {
      setError('ログアウトできませんでした。もう一度お試しください。');
    }
  };

  const account = Boolean(user && !user.isAnonymous);
  const state = (value: boolean | undefined) => value === undefined
    ? unknown ? '確認できませんでした' : '確認しています…'
    : value ? 'つながっています' : 'まだつながっていません';

  return (
    <section className="panel">
      <h2>アカウント</h2>
      {account ? <p>✓ Camelliaアカウントに接続中</p> : <p className="empty">ログアウト中です。保存済みデータはこの端末に残っています。</p>}
      {account && <ul className="linked-methods"><li><span>LINE</span><b>{state(linked?.line)}</b></li><li><span>SchoolPark Passport</span><b>{state(linked?.schoolpark)}</b></li></ul>}
      {account && (googleLinked
        ? <p className="account-provider-state">✓ Google連携済み</p>
        : <button className="settings-link" disabled={busy || googleOnly} onClick={() => void connectGoogle()}>{busy ? 'Googleに接続しています…' : 'Googleアカウントもつなぐ'}</button>)}
      {account && (unknown || linked && !linked.schoolpark) && <button className="settings-link" disabled={googleOnly} onClick={() => connect('schoolpark')}>SchoolPark Passportもつなぐ</button>}
      {account && (unknown || linked && !linked.line) && <button className="settings-link" disabled={googleOnly} onClick={() => connect('line')}>LINEもつなぐ</button>}
      {googleOnly && <small className="account-link-limit">Googleだけで作成したアカウントでは、LINE / Passportを同じ記録へつなぐ操作は未対応です。以前LINEを使っていた方は、LINEでログインしてからGoogleをつないでください。</small>}
      {account && <button className="settings-link" onClick={() => void leave()}>ログアウト</button>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <small>つないだ方法なら、どちらでログインしても同じ記録に戻ります。別のCamelliaアカウントで使っている方法は、記録を守るため自動ではつなぎません。ログアウトしても保存済みデータは削除されません。</small>
    </section>
  );
}
