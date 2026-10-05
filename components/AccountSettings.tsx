'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import { logoutCamellia, startLineLogin, startSchoolParkLogin } from '@/lib/auth/camellia';

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(schoolParkAuth.currentUser);
  const [provider, setProvider] = useState('');
  const [error, setError] = useState('');
  useEffect(() => onAuthStateChanged(schoolParkAuth, async (next) => {
    setUser(next);
    if (!next) return setProvider('');
    const result = await next.getIdTokenResult().catch(() => null);
    setProvider(typeof result?.claims.provider === 'string' ? result.claims.provider : '');
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
    {user ? <p>✓ {label}で利用中</p> : <p className="empty">ログアウト中です。</p>}
    <button className="settings-link" onClick={() => connect('schoolpark')}>SchoolPark Passportをつなぐ</button>
    <button className="settings-link" onClick={() => connect('line')}>LINEをつなぐ</button>
    {user && <button className="settings-link" onClick={() => void leave()}>ログアウト</button>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <small>ログアウトしても、Camelliaアカウントに保存されたデータは削除されません。</small>
  </section>;
}
