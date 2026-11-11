/* oxlint-disable next/no-img-element -- approved same-origin decoration assets */
'use client';
import { useEffect, useState } from 'react';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import type { TreeDecoration } from '@/lib/referral/decorations';
type State = {
  owned: {
    creditId: string;
    decorationId: string;
    decoration: TreeDecoration | null;
  }[];
  choices: { creditId: string; options: TreeDecoration[] }[];
  active: TreeDecoration | null;
  catalogReady: boolean;
  moreCredits: boolean;
};
export function TreeDecorations({
  onActive,
}: {
  onActive: (value: TreeDecoration | null) => void;
}) {
  const [value, setValue] = useState<State>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [failedAsset, setFailedAsset] = useState(''),
    [loaded, setLoaded] = useState<string[]>([]);
  const request = async (body?: Record<string, unknown>) => {
    const user = schoolParkAuth.currentUser;
    if (!user || user.isAnonymous) return;
    const response = await fetch('/api/camellia/tree-decoration', {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
    if (schoolParkAuth.currentUser?.uid !== user.uid)
      throw new Error('ACCOUNT_CHANGED');
    if (!response.ok) throw new Error('UNAVAILABLE');
    return (await response.json()) as State;
  };
  useEffect(() => {
    let active = true;
    void request()
      .then((v) => {
        if (active) setValue(v);
      })
      .catch(() => {
        if (active)
          setError(
            '装飾の状態を確認できませんでした。My Treeの記録はそのまま使えます。',
          );
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    onActive(value?.active ?? null);
  }, [value?.active, onActive]);
  const change = async (body: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setValue(await request(body));
    } catch {
      setError('変更できませんでした。少し時間をおいてお試しください。');
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="tree-decorations">
      <summary>My Treeの装飾</summary>
      <p className="meta">
        選んだ装飾はFree・Plusどちらでも使えます。取得済みの選択権は会員プランや紹介受付の終了で消えません。人とのつながりに点数は付けません。
      </p>
      {error && <output>{error}</output>}
      {value?.active && (
        <section aria-label="選択中の装飾">
          <strong>{value.active.label}</strong>
          {failedAsset !== value.active.assetPath ? (
            <img
              src={value.active.assetPath}
              alt={value.active.label}
              loading="lazy"
              onError={() => setFailedAsset(value.active!.assetPath)}
              style={{ maxWidth: '100%', maxHeight: 180 }}
            />
          ) : (
            <p>
              装飾の画像を読み込めませんでした。取得済みの装飾は残っています。
            </p>
          )}
          <button
            disabled={busy}
            onClick={() =>
              void change({ operation: 'equip', decorationId: null })
            }
          >
            装飾を外す
          </button>
        </section>
      )}
      {!value?.catalogReady && (
        <p>
          装飾のデザインと紹介制度は準備中です。紹介受付・課金は始まりません。
        </p>
      )}
      {value?.choices.map((credit) => (
        <section key={credit.creditId}>
          <p>取得済みの装飾選択権</p>
          {credit.options.length ? (
            credit.options.map((option) => (
              <section key={option.id}>
                <img
                  src={option.assetPath}
                  alt={option.label}
                  loading="lazy"
                  style={{ maxWidth: '100%', maxHeight: 160 }}
                  onLoad={() =>
                    setLoaded((v) =>
                      v.includes(option.assetPath)
                        ? v
                        : [...v, option.assetPath],
                    )
                  }
                  onError={() => setFailedAsset(option.assetPath)}
                />
                {failedAsset === option.assetPath && (
                  <p>
                    画像を確認できないため、まだ選択できません。接続を確認して開き直してください。
                  </p>
                )}
                <button
                  disabled={busy || !loaded.includes(option.assetPath)}
                  onClick={() => {
                    if (
                      confirm(
                        `「${option.label}」を選びますか？この選択権で選べる装飾は1つです。`,
                      )
                    )
                      void change({
                        operation: 'claim',
                        creditId: credit.creditId,
                        decorationId: option.id,
                      });
                  }}
                >
                  {option.label}を選ぶ
                </button>
              </section>
            ))
          ) : (
            <p>
              選べるデザインの公開をお待ちください。選択権は保持しています。
            </p>
          )}
        </section>
      ))}
      {value?.owned.map((owned) => (
        <div key={owned.creditId}>
          <span>
            {owned.decoration?.label ??
              '取得済みの装飾（現在のデザイン公開を確認中）'}
          </span>
          {owned.decoration && (
            <button
              disabled={busy || value.active?.id === owned.decorationId}
              onClick={() =>
                void change({
                  operation: 'equip',
                  decorationId: owned.decorationId,
                })
              }
            >
              この装飾を使う
            </button>
          )}
        </div>
      ))}
      {value?.moreCredits && (
        <p>ほかの取得済み選択権は運営へ確認できます。権利は保持しています。</p>
      )}
    </details>
  );
}
