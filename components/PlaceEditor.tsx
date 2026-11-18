'use client';
import { useState } from 'react';
import {
  PLACE_CATEGORIES,
  PLACE_INTENTS,
  validatePlace,
  type Place,
} from '@/lib/place/model';
const fields = [
  ['slug', '公開URL用の名前（半角英数字・ハイフン）', 80],
  ['name', '店舗・施設名', 100],
  ['region', '地域', 60],
  ['area', 'エリア', 60],
  ['shortDescription', '短い紹介', 180],
  ['experience', 'ここでできる体験', 600],
  ['description', '紹介文', 1500],
  ['address', '住所', 200],
  ['priceRange', '料金の案内', 80],
  ['duration', '所要時間の案内', 80],
  ['openingHours', '営業時間の案内', 300],
  ['officialUrl', '公式URL', 1000],
  ['bookingUrl', '予約URL（任意）', 1000],
  ['mapUrl', '地図URL（任意）', 1000],
  ['instagramUrl', 'Instagram URL（任意）', 1000],
  ['contactUrl', '問い合わせURL（任意）', 1000],
  ['phone', '電話番号（任意）', 30],
] as const;
export function PlaceEditor({
  place,
  onSave,
  onCancel,
}: {
  place?: Place;
  onSave: (
    value: Record<string, unknown>,
    expectedUpdatedAt: string | null,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(
      place
        ? { ...place }
        : {
            category: '',
            partnerStatus: 'none',
            sponsored: false,
            recommendedFor: [],
          },
    ),
    [images, setImages] = useState((place?.imageUrls ?? []).join('\n')),
    [services, setServices] = useState((place?.services ?? []).join('\n')),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className="panel place-editor"
      aria-label="掲載情報の下書き"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setError('');
        setBusy(true);
        try {
          const value = validatePlace({
            ...draft,
            imageUrls: images
              .split('\n')
              .map((x) => x.trim())
              .filter(Boolean),
            services: services
              .split('\n')
              .map((x) => x.trim())
              .filter(Boolean),
          });
          await onSave(value, place?.updatedAt ?? null);
        } catch {
          setError(
            '保存できませんでした。入力内容と接続を確認してください。他の担当者が更新した場合は、下書きを控えてから一覧を開き直してください。',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{place ? '掲載内容を編集する' : '掲載候補を追加する'}</h2>
      <p>
        保存すると下書きになります。公開中の内容を変更した場合も、再度運営が確認します。掲載許可・写真許可の証跡は運営が別に管理します。
      </p>
      {fields.map(([key, label, max]) => (
        <label key={key}>
          {label}
          <textarea
            rows={key === 'description' || key === 'experience' ? 3 : 1}
            required={['slug', 'name', 'region', 'area'].includes(key)}
            maxLength={max}
            disabled={key === 'slug' && Boolean(place)}
            value={typeof draft[key] === 'string' ? draft[key] : ''}
            onChange={(e) => setDraft((v) => ({ ...v, [key]: e.target.value }))}
          />
        </label>
      ))}
      <label>
        カテゴリ
        <select
          aria-label="カテゴリ"
          required
          value={typeof draft.category === 'string' ? draft.category : ''}
          onChange={(e) =>
            setDraft((v) => ({ ...v, category: e.target.value }))
          }
        >
          <option value="">選んでください</option>
          {PLACE_CATEGORIES.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        体験・サービス（1行に1件）
        <textarea
          rows={3}
          value={services}
          onChange={(e) => setServices(e.target.value)}
        />
      </label>
      <label>
        利用許可を確認する写真のURL（1行に1件・最大5件）
        <textarea
          rows={3}
          value={images}
          onChange={(e) => setImages(e.target.value)}
        />
      </label>
      <fieldset>
        <legend>合う過ごし方（最大4つ）</legend>
        {Object.entries(PLACE_INTENTS).map(([id, label]) => (
          <label className="privacy-choice" key={id}>
            <input
              type="checkbox"
              checked={
                Array.isArray(draft.recommendedFor) &&
                draft.recommendedFor.includes(id)
              }
              onChange={(e) =>
                setDraft((v) => ({
                  ...v,
                  recommendedFor: e.target.checked
                    ? [
                        ...(Array.isArray(v.recommendedFor)
                          ? v.recommendedFor
                          : []),
                        id,
                      ]
                    : (Array.isArray(v.recommendedFor)
                        ? v.recommendedFor
                        : []
                      ).filter((x) => x !== id),
                }))
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button className="primary" disabled={busy}>
        下書きを保存する
      </button>
      <button
        type="button"
        className="secondary-button"
        disabled={busy}
        onClick={onCancel}
      >
        編集を閉じる
      </button>
    </form>
  );
}
