'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import { startLineLogin, startSchoolParkLogin } from '@/lib/auth/camellia';
import { welcomeTheme } from '@/lib/welcome/time';

export function AccountScreen({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (method: 'line' | 'schoolpark') => void;
}) {
  const [user, setUser] = useState<User | null>(schoolParkAuth.currentUser);
  const [error, setError] = useState('');
  const theme = welcomeTheme();
  useEffect(() => onAuthStateChanged(schoolParkAuth, setUser), []);
  const begin = (method: 'line' | 'schoolpark') => {
    setError('');
    onSelect(method);
    try {
      if (method === 'line') startLineLogin();
      else startSchoolParkLogin();
    } catch (reason) {
      setError(reason instanceof Error && reason.message === 'LINE_NOT_CONFIGURED'
        ? 'LINEログインは現在準備中です。'
        : 'うまくつながりませんでした。もう一度試してみてください。');
    }
  };
  const anonymous = Boolean(user?.isAnonymous);
  return <main className={`account-screen welcome--${theme.period}`}>
    <button className="account-back" onClick={onBack} aria-label="前へ戻る">←</button>
    <section className="account-card">
      <div className="account-flower">✿</div><p className="welcome-brand">Camellia</p>
      <h1>あなたのCamelliaを、<br />どこからはじめますか？</h1>
      {anonymous && <p className="account-note">この端末にあるこれまでの記録は、つないだアカウントへ安全に引き継ぎます。</p>}
      <button className="auth-choice schoolpark" onClick={() => begin('schoolpark')}>
        <b>🏫 SchoolParkとつなぐ</b>
        <span>SchoolPark Passportを使って、Camelliaをはじめる。</span>
        <strong>SchoolPark Passportとつなぐ</strong>
      </button>
      <button className="auth-choice line" onClick={() => begin('line')}>
        <b>💚 LINEではじめる</b>
        <span>LINEでCamelliaのアカウントを作成、またはログインします。</span>
        <strong>LINEでつづける</strong>
      </button>
      <p className="account-policy">
        ログインまたは登録することで、
        <a href="/terms.html">利用規約</a>・<a href="/privacy.html">プライバシーポリシー</a>
        に同意したものとみなします。
      </p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <p className="account-note">アカウントをつくると、これまでのCamelliaの記録を続けて利用できます。</p>
    </section>
  </main>;
}
