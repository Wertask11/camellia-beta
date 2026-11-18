'use client';
import { saveServerNotificationPreferences } from '@/lib/notifications/client';
import { useState } from 'react';
import {
  NOTIFICATION_TOPICS,
  safeNotificationPreview,
  type NotificationPreferences as Preferences,
} from '@/lib/notifications/preferences';
export function NotificationPreferences({
  value,
  onSave,
}: {
  value?: Preferences;
  onSave: (value: Preferences) => void;
}) {
  const [requested, setRequested] = useState(value?.requested ?? false),
    [topics, setTopics] = useState<Preferences['topics']>(value?.topics ?? []),
    [frequency, setFrequency] = useState<Preferences['frequency'] | ''>(
      value?.frequency ?? '',
    ),
    [saved, setSaved] = useState(false),
    [serverSaved, setServerSaved] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false);
  const preview = safeNotificationPreview();
  return (
    <details className="my-feature-preferences">
      <summary>通知の好み（配信は準備中）</summary>
      <section className="panel">
        <p>
          今は通知を配信しません。ここでは希望だけを保存します。開始前には改めて通知の許可を確認します。通知を希望しなくても基本機能は使えます。
        </p>
        <label className="privacy-choice">
          <input
            type="checkbox"
            checked={requested}
            onChange={(e) => {
              setRequested(e.target.checked);
              setSaved(false);
            }}
          />
          配信が始まったら通知を希望する
        </label>
        {Object.entries(NOTIFICATION_TOPICS).map(([id, label]) => (
          <label className="privacy-choice" key={id}>
            <input
              type="checkbox"
              checked={topics.includes(id as keyof typeof NOTIFICATION_TOPICS)}
              onChange={(e) => {
                setTopics((t) =>
                  e.target.checked
                    ? [...t, id as keyof typeof NOTIFICATION_TOPICS]
                    : t.filter((x) => x !== id),
                );
                setSaved(false);
              }}
            />
            {label}
          </label>
        ))}
        <label>
          希望する頻度
          <select
            aria-label="希望する通知頻度"
            value={frequency}
            onChange={(e) => {
              setFrequency(e.target.value as typeof frequency);
              setSaved(false);
            }}
          >
            <option value="">選んでください</option>
            <option value="daily">1日に1回まで</option>
            <option value="weekly">週に1回まで</option>
            <option value="monthly">月に1回まで</option>
          </select>
        </label>
        <p className="meta">
          ロック画面の表示例：{preview.title} · {preview.body}
          　Checkや会話の内容、Circleのテーマは表示しません。
        </p>
        <button
          className="secondary-button"
          disabled={busy || (requested && (!topics.length || !frequency))}
          onClick={async () => {
            const preferences: Preferences = {
              requested,
              topics: requested ? topics : [],
              frequency: frequency || 'weekly',
              updatedAt: new Date().toISOString(),
            };
            onSave(preferences);
            setSaved(true);
            setServerSaved(null);
            setBusy(true);
            try {
              setServerSaved(
                await saveServerNotificationPreferences(preferences),
              );
            } catch {
              setServerSaved(false);
            } finally {
              setBusy(false);
            }
          }}
        >
          通知の好みを保存する
        </button>
        {saved && (
          <output>
            希望を保存しました。通知配信は始まりません。
            {serverSaved === true
              ? 'アカウントにも希望を保存しました。'
              : serverSaved === false
                ? '通知サービスへの保存は確認できていません。接続を確認して、もう一度保存してください。'
                : ''}
          </output>
        )}
      </section>
    </details>
  );
}
