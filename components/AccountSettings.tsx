'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import { getLinkedCamelliaMethods, logoutCamellia, startLineLogin, startSchoolParkLogin } from '@/lib/auth/camellia';

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(schoolParkAuth.currentUser);
  const [provider, setProvider] = useState('');
  const [linked, setLinked] = useState({ line: false, schoolpark: false });
  const [loading, setLoading] = useState(Boolean(schoolParkAuth.currentUser));
  const [error, setError] = useState('');
  useEffect(() => onAuthStateChanged(schoolParkAuth, async (next) => {
    setUser(next);
    if (!next) {
      setProvider('');
      setLinked({ line: false, schoolpark: false });
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await next.getIdTokenResult().catch(() => null);
    setProvider(typeof result?.claims.provider === 'string' ? result.claims.provider : '');
    try {
      setLinked(await getLinkedCamelliaMethods());
      setError('');
    } catch {
      setError('連携状態を確認できませんでした。通信できる状態で再読み込みしてください。');
    } finally {
      setLoading(false);
    }
  }), []);
  const connect = (method: 'line' | 'schoolpark') => {
    setError('');
    try {
      if (method === 'line') startLineLogin();
      else startSchoolParkLogin();
    } catch {
      setError('うまくつながりませんでした。もう一度試してください。');
    }
  };
  const leave = async () => {
    try {
      await logoutCamellia();
      setError('ログアウトしました。保存済みデータは削除されていません。');
    } catch {
      setError('ログアウトできませんでした。もう一度お試しください。');
    }
  };
  const label = provider === 'schoolpark' ? 'SchoolPark Passport'
    : provider === 'line' ? 'LINE' : user ? 'Camelliaアカウント' : '';
  return <section className="panel"><h2>アカウント</h2>
    {user ? <p>✓ {user.isAnonymous ? 'この端末で利用中' : label + 'で利用中'}</p> : <p className="empty">ログアウト中です。</p>}
    <p>LINE：{loading ? '確認中…' : linked.line ? '✓ 連携済み' : '未連携'}</p>
    <p>SchoolPark Passport：{loading ? '確認中…' : linked.schoolpark ? '✓ 連携済み' : '未連携'}</p>
    {!linked.schoolpark && <button className="settings-link" onClick={() => connect('schoolpark')}>SchoolPark Passportをつなぐ</button>}
    {!linked.line && <button className="settings-link" onClick={() => connect('line')}>LINEをつなぐ</button>}
    {user && <button className="settings-link" onClick={() => void leave()}>ログアウト</button>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <small>ログアウトしても、Camelliaアカウントに保存されたデータは削除されません。</small>
  </section>;
}
