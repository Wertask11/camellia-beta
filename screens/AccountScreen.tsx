'use client';

import { useEffect, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import { startLineLogin } from '@/lib/auth/camellia';
import { welcomeTheme } from '@/lib/welcome/time';

export type AuthMethod = 'line' | 'google';

function googleError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'auth/account-exists-with-different-credential' || code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
    return { reason: 'account_conflict', stage: 'account_conflict', message: 'このGoogleアカウントは別のログイン方法ですでに使われています。以前の方法でログインし、アカウント設定からGoogleを連携してください。' };
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return { reason: 'user_cancelled', stage: 'cancelled', message: 'Googleログインをキャンセルしました。' };
  }
  if (code === 'auth/popup-blocked') {
    return { reason: 'popup_blocked', stage: 'provider_open', message: 'ポップアップがブロックされました。このサイトのポップアップを許可して、もう一度お試しください。' };
  }
  if (code === 'auth/operation-not-allowed') {
    return { reason: 'provider_error', stage: 'provider_open', message: 'Googleログインは現在準備中です。LINEでログインしてください。' };
  }
  if (code === 'auth/network-request-failed') {
    return { reason: 'network', stage: 'provider_return', message: '通信を確認して、もう一度お試しください。' };
  }
  return { reason: 'provider_error', stage: 'provider_return', message: 'Googleにつながりませんでした。もう一度お試しください。' };
}

export function AccountScreen({
  onContinue,
  onBack,
  onSelect,
  onAuthReturned,
  onLoginSuccess,
  onLoginFailure,
  returning = false,
  notice = '',
  purpose = 'login',
  embedded = false,
}: {
  onContinue: () => void;
  onBack?: () => void;
  onSelect: (method: AuthMethod) => void;
  onAuthReturned: (method: AuthMethod) => void;
  onLoginSuccess: (method: AuthMethod, uid?: string) => void;
  onLoginFailure: (method: AuthMethod, reason: string, stage: string) => void;
  returning?: boolean;
  notice?: string;
  purpose?: 'login' | 'save-check';
  embedded?: boolean;
}) {
  const [user, setUser] = useState<User | null>(schoolParkAuth.currentUser?.isAnonymous ? null : schoolParkAuth.currentUser);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const authStarted = useRef(false);
  const theme = welcomeTheme();

  useEffect(() => onAuthStateChanged(schoolParkAuth, (next) => setUser(next?.isAnonymous ? null : next)), []);

  const beginLine = () => {
    if (authStarted.current) return;
    authStarted.current = true;
    setConnecting(true);
    setError('');
    onSelect('line');
    try {
      startLineLogin();
    } catch (cause) {
      authStarted.current = false;
      setConnecting(false);
      onLoginFailure('line', 'provider_error', 'provider_open');
      setError(cause instanceof Error&&cause.message==='GUEST_CHECK_STORAGE_UNAVAILABLE'?'この端末ではLINEへの移動中にCheckを保持できません。Googleで記録を残すか、ブラウザの保存設定を確認してください。':'LINEログインを開始できませんでした。もう一度お試しください。');
    }
  };

  const beginGoogle = async () => {
    if (authStarted.current) return;
    authStarted.current = true;
    setError('');
    setConnecting(true);
    onSelect('google');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(schoolParkAuth, provider);
      onAuthReturned('google');
      onLoginSuccess('google', result.user.uid);
      setUser(result.user);
    } catch (cause) {
      const failure = googleError(cause);
      const returned = failure.stage === 'provider_return' || failure.stage === 'cancelled' || failure.stage === 'account_conflict';
      if (returned) onAuthReturned('google');
      onLoginFailure('google', failure.reason, failure.stage);
      setError(failure.message);
    } finally {
      authStarted.current = false;
      setConnecting(false);
    }
  };

  const Container = embedded ? 'section' : 'main';
  const Heading = embedded ? 'h2' : 'h1';
  const savingCheck = purpose === 'save-check';
  return (
    <Container className={embedded?'guest-save-prompt':`account-screen welcome--${theme.period}`} aria-label={savingCheck?'今日の記録を残す':undefined}>
      {onBack && <button className="account-back" onClick={onBack} aria-label="前へ戻る">←</button>}
      <section className="account-card">
        <div className="account-flower" aria-hidden="true">✿</div>
        <p className="welcome-brand">Camellia</p>
        <Heading>{savingCheck?<>今日のあなたを、<br/>明日のあなたにつなげよう。</>:user || returning ? 'おかえりなさい。' : <>今日の記録を、<br />明日のあなたへ。</>}</Heading>
        {user ? (
          <>
            <div className="account-status"><span>✓</span><div><b>アカウント接続済み</b><small>今日のあなたの続きを、ここから。</small></div></div>
            <button className="welcome-primary" onClick={onContinue}>Todayへ</button>
          </>
        ) : (
          <>
            <p className="account-reason">{savingCheck?<>記録を残すと、昨日との違いや、あなたに合った過ごし方を少しずつ振り返れるようになります。</>:<>昨日と今日の変化を振り返れるよう、<br />あなたの記録をアカウントにつなぎます。</>}</p>
            {returning && !savingCheck && <p className="account-policy">続けるには、前に使ったLINEまたはGoogleでログインしてください。この端末の記録は消えずに残っています。</p>}
            <button className="auth-primary auth-line" onClick={beginLine} disabled={connecting}>
              <span className="auth-brand-icon line-icon" aria-hidden="true">L</span>{connecting ? '認証画面へ移動しています…' : savingCheck?'LINEで記録を残す':'LINEで続ける'}
            </button>
            <button className="auth-primary auth-google" onClick={() => void beginGoogle()} disabled={connecting}>
              <span className="auth-brand-icon google-icon" aria-hidden="true">G</span>{connecting ? 'Googleに接続しています…' : savingCheck?'Googleで記録を残す':'Googleで続ける'}
            </button>
            <p className="account-policy account-consent">ログインまたは登録することで、<a href="/terms.html" target="_blank" rel="noopener">利用規約</a>・<a href="/privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a>に同意したものとみなします。</p>
            {(notice || error) && <p className="auth-error" role="alert">{notice || error}</p>}
          </>
        )}
        <p className="account-note">今日の記録を、明日のあなたへ。</p>
      </section>
    </Container>
  );
}
