'use client';
import { useState } from 'react';
import type { CamelliaState } from '@/types';
import { mergePersonalBackup } from '@/lib/storage/backup';
export function PersonalBackupRestore({
  state,
  onRestore,
}: {
  state: CamelliaState;
  onRestore: (input: unknown, expectedProfile: string) => void;
}) {
  const [input, setInput] = useState<unknown>(),
    [owner, setOwner] = useState(''),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false),
    [done, setDone] = useState(false);
  return (
    <section className="panel">
      <h3>自分の書き出した記録を戻す</h3>
      <p className="meta">
        同じアカウントのファイルだけを確認して追加します。現在の記録・削除済みの記録・通知設定を古い内容で上書きせず、復元前の端末記録も控えに残します。クラウドで競合した場合は上書きを止めます。
      </p>
      <label>
        個人記録のファイル
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            setReady(false);
            setDone(false);
            setError('');
            if (!file) return;
            try {
              if (file.size > 10 * 1024 * 1024)
                throw new Error('INVALID_BACKUP');
              const value = JSON.parse(await file.text());
              mergePersonalBackup(state, value);
              setInput(value);
              setOwner(state.profile.id);
              setReady(true);
            } catch {
              setError(
                'このアカウントの記録ファイルとして確認できませんでした。原本は変更していません。',
              );
            }
          }}
        />
      </label>
      {ready && (
        <button
          className="secondary-button"
          onClick={() => {
            try {
              onRestore(input, owner);
              setReady(false);
              setDone(true);
            } catch {
              setError(
                '復元できませんでした。アカウントや端末の保存容量を確認してください。現在の記録はそのままです。',
              );
            }
          }}
        >
          確認した記録を追加する（現在の控えも残す）
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {done && (
        <output>
          端末に記録を追加しました。アカウントへの保存状態は「記録の保存」で確認できます。
        </output>
      )}
    </section>
  );
}
