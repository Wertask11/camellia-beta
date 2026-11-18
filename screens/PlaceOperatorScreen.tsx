'use client';
import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import {
  finishAuthCallback,
  startLineLogin,
  logoutCamellia,
} from '@/lib/auth/camellia';
import {
  armOperatorLogin,
  clearOperatorLogin,
} from '@/lib/place/operator-intent';
import { placeRequest } from '@/lib/place/client';
import { PlaceScreen } from '@/screens/PlaceScreen';
const ignoreTrack = () => {};
export function PlaceOperatorScreen() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [allowed, setAllowed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(schoolParkAuth, (u) => {
      if (active) {
        setUser(u);
        setAllowed(false);
      }
    });
    void finishAuthCallback()
      .catch(() => {
        if (active)
          setError('ログインを確認できませんでした。もう一度お試しください。');
      })
      .finally(() => {
        clearOperatorLogin();
        const url = new URL(location.href);
        url.searchParams.set('open', 'place-operator');
        history.replaceState({}, '', url.pathname + url.search);
        if (active) setReady(true);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!ready || !user || user.isAnonymous) return;
    let active = true;
    void placeRequest('?operatorStatus=1', undefined, true)
      .then((v) => {
        if (active) {
          setAllowed(v.operator === true);
          if (!v.operator)
            setError(
              '担当する掲載場所がまだ割り当てられていません。運営へ確認してください。',
            );
        }
      })
      .catch(() => {
        if (active)
          setError(
            '掲載管理に接続できませんでした。再読み込みしてお試しください。',
          );
      });
    return () => {
      active = false;
    };
  }, [ready, user]);
  const google = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      armOperatorLogin();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(schoolParkAuth, provider);
    } catch {
      setError(
        'Googleでの確認を完了できませんでした。もう一度お試しください。',
      );
    } finally {
      clearOperatorLogin();
      setBusy(false);
    }
  };
  return (
    <div className="app-shell">
      <header className="screen">
        <p className="eyebrow">Camellia Place</p>
        <h1>店舗・施設の掲載管理</h1>
        <p>
          担当場所の下書き、審査依頼、掲載停止、閲覧・クリック集計を確認できます。
        </p>
        <p className="meta">
          掲載は基本無料です。公開は運営の確認後に行います。
        </p>
        {error && <p role="alert">{error}</p>}
        {!ready ? (
          <output>ログイン状態を確認しています…</output>
        ) : !user || user.isAnonymous ? (
          <div className="choice-bridge">
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                try {
                  armOperatorLogin();
                  startLineLogin();
                } catch {
                  clearOperatorLogin();
                  setError(
                    'LINEでの確認を開始できませんでした。もう一度お試しください。',
                  );
                }
              }}
            >
              LINEで掲載管理を開く
            </button>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void google()}
            >
              Googleで掲載管理を開く
            </button>
          </div>
        ) : (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void logoutCamellia().finally(() => setBusy(false));
            }}
          >
            掲載管理からログアウト
          </button>
        )}
        <button className="text-button" onClick={()=>location.assign('/')}>Camelliaへ戻る</button>
      </header>
      {ready && allowed && (
        <PlaceScreen
          managementOnly
          onBack={() => location.assign('/')}
          onTrack={ignoreTrack}
        />
      )}
    </div>
  );
}
