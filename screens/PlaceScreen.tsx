/* oxlint-disable next/no-img-element -- operator-reviewed external photos use native lazy loading without an image proxy */
'use client';
import { useEffect, useState } from 'react';
import { placeRequest } from '@/lib/place/client';
import { PLACE_CATEGORIES, PLACE_INTENTS, type Place } from '@/lib/place/model';
import type { AnalyticsEventName } from '@/types';
type Props = {
  demoPlaces?: Place[];
  onBack: () => void;
  onTrack: (
    name: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>,
  ) => void;
  initialSlug?: string;
  savedOnly?: boolean;
};
export function PlaceScreen({
  demoPlaces,
  onBack,
  onTrack,
  initialSlug,
  savedOnly = false,
}: Props) {
  const isDemo = Boolean(demoPlaces);
  const [places, setPlaces] = useState<Place[]>([]),
    [selected, setSelected] = useState<Place>(),
    [cursor, setCursor] = useState<string>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [category, setCategory] = useState(''),
    [area, setArea] = useState(''),
    [intent, setIntent] = useState(''),
    [operator, setOperator] = useState(false),
    [operatorMode, setOperatorMode] = useState(false);
  const load = async (next?: string, manage = false) => {
    if (demoPlaces) {
      setPlaces(demoPlaces);
      return;
    }
    const data = await placeRequest(
      `${manage ? '?operator=1' : savedOnly ? '?saved=1' : '?'}${next ? `&cursor=${next}` : ''}`,
      undefined,
      manage,
    );
    setPlaces((current) => (next ? [...current, ...data.places] : data.places));
    setCursor(data.nextCursor);
    setOperatorMode(manage);
  };
  useEffect(() => {
    let active = true;
    if (demoPlaces) {
      queueMicrotask(() => {
        if (active) {
          setPlaces(demoPlaces);
          setSelected(demoPlaces.find((place) => place.slug === initialSlug));
        }
      });
      return () => {
        active = false;
      };
    }
    void placeRequest(savedOnly ? '?saved=1' : '')
      .then((data) => {
        if (active) {
          setPlaces(data.places);
          setCursor(data.nextCursor);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    void placeRequest('?operatorStatus=1', undefined, true)
      .then((data) => {
        if (active) setOperator(data.operator === true);
      })
      .catch(() => {});
    if (initialSlug)
      void placeRequest(`?slug=${encodeURIComponent(initialSlug)}`)
        .then((data) => {
          if (active) {
            setSelected(data.place);
            onTrack('place_view', { place_id: data.place.slug });
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [initialSlug, onTrack, savedOnly, demoPlaces]);
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : '今は利用できません。');
    } finally {
      setBusy(false);
    }
  };
  const open = (place: Place) => {
    setSelected(place);
    if (!operatorMode && !isDemo)
      onTrack('place_view', { place_id: place.slug });
    const url = new URL(location.href);
    url.searchParams.set('open', isDemo ? 'place-demo' : 'place');
    url.searchParams.set('place', place.slug);
    history.replaceState({}, '', url.pathname + url.search);
  };
  const filtered = places.filter(
    (place) =>
      (!savedOnly || place.saved === true) &&
      (!category || place.category === category) &&
      (!area || place.area === area) &&
      (!intent || place.recommendedFor.includes(intent)),
  );
  const reason = (place: Place) =>
    intent && place.recommendedFor.includes(intent)
      ? `「${PLACE_INTENTS[intent as keyof typeof PLACE_INTENTS]}」という希望に合う場所です。`
      : '気になる場所から、自分で選べます。';
  const external = (label: string, url: string, event: AnalyticsEventName) =>
    url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onTrack(event, { place_id: selected!.slug })}
      >
        {label} ↗
      </a>
    ) : null;
  const card = (place: Place) => (
    <button className="place-card" key={place.id} onClick={() => open(place)}>
      {place.imageUrls[0] && (
        <img
          src={place.imageUrls[0]}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      )}
      <span>
        {place.sponsored && <small>PR・広告</small>}
        <strong>{place.name}</strong>
        <small>
          {place.category} · {place.area}
        </small>
        <span>{place.shortDescription}</span>
        <small>
          {place.priceRange || '価格は公式情報をご確認ください'} ·{' '}
          {place.duration || '時間は自由に'}
        </small>
        <small>{reason(place)}</small>
      </span>
    </button>
  );
  return (
    <main className="screen place-screen">
      <button
        className="back"
        onClick={() => {
          if (selected) {
            setSelected(undefined);
            const url = new URL(location.href);
            url.searchParams.delete('place');
            history.replaceState({}, '', url.pathname + url.search);
          } else onBack();
        }}
      >
        ←{' '}
        {selected ? 'Place一覧へ' : isDemo ? 'デモを閉じる' : 'Discoverへ戻る'}
      </button>
      <header>
        <div>
          <p className="eyebrow">
            {isDemo ? 'Placeの掲載イメージ' : '今日の自分に合う、現実の場所へ'}
          </p>
          <h1>{selected?.name ?? (savedOnly ? '保存したPlace' : 'Place')}</h1>
        </div>
      </header>
      {isDemo && (
        <section
          className="panel place-demo-notice"
          role="note"
          aria-label="Placeデモについて"
        >
          <strong>デモ · 掲載イメージ</strong>
          <p>
            実在の掲載店舗・施設ではありません。写真は雰囲気を伝える参考画像です。予約・地図・保存は利用できません。確認した実在の場所に、後から差し替えられます。
          </p>
        </section>
      )}
      {error && (
        <p role="alert">
          {error}
          <button
            disabled={busy}
            onClick={() => void run(() => load(undefined, operatorMode))}
          >
            もう一度読み込む
          </button>
        </p>
      )}
      {busy && <output>…</output>}
      {operator && (
        <details>
          <summary>運営の掲載確認</summary>
          <button
            disabled={busy}
            onClick={() => void run(() => load(undefined, !operatorMode))}
          >
            {operatorMode ? '公開一覧に戻る' : 'draft / reviewを確認する'}
          </button>
          <p className="meta">
            登録は運営用APIから行います。公開前に実在情報・写真の権利・提携表示を確認してください。
          </p>
        </details>
      )}
      {selected ? (
        <article className="place-detail">
          {operatorMode && (
            <output>運営プレビュー・掲載状態：{selected.status}</output>
          )}
          {selected.sponsored && <p>PR・広告</p>}
          {selected.imageUrls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ))}
          <p>{selected.description}</p>
          <p>{reason(selected)}</p>
          <dl>
            <dt>エリア</dt>
            <dd>
              {selected.region} · {selected.area}
            </dd>
            <dt>住所</dt>
            <dd>{selected.address || '公式情報をご確認ください'}</dd>
            <dt>営業時間</dt>
            <dd>{selected.openingHours || '公式情報をご確認ください'}</dd>
            <dt>価格帯</dt>
            <dd>{selected.priceRange || '公式情報をご確認ください'}</dd>
            <dt>所要時間</dt>
            <dd>{selected.duration || '時間は自由に'}</dd>
          </dl>
          {selected.partnerStatus === 'partner' && (
            <p>掲載内容を確認した提携先です。</p>
          )}
          {selected.specialOffer && <p>{selected.specialOffer}</p>}
          {!isDemo && (
            <>
              <nav aria-label="場所の外部情報">
                {external(
                  '公式サイト',
                  selected.officialUrl,
                  'place_external_open',
                )}
                {external(
                  'Instagram',
                  selected.instagramUrl,
                  'place_external_open',
                )}
                {external(
                  '予約サイト',
                  selected.bookingUrl,
                  'place_booking_open',
                )}
                {external('地図を開く', selected.mapUrl, 'place_map_open')}
              </nav>
              <p className="meta">
                リンク先は外部サービスです。営業時間・価格・予約条件は公式情報をご確認ください。CamelliaのCheckや会話はリンクに付加しません。
              </p>
            </>
          )}
          {!operatorMode && !isDemo && (
            <button
              className="primary"
              disabled={busy}
              aria-pressed={selected.saved === true}
              onClick={() => {
                void run(async () => {
                  await placeRequest('', {
                    operation: 'bookmark',
                    slug: selected.slug,
                    saved: !selected.saved,
                  });
                  setSelected({ ...selected, saved: !selected.saved });
                  setPlaces((items) =>
                    items.map((p) =>
                      p.slug === selected.slug
                        ? { ...p, saved: !selected.saved }
                        : p,
                    ),
                  );
                  if (!selected.saved)
                    onTrack('place_save', { place_id: selected.slug });
                });
              }}
            >
              {selected.saved === true ? '保存を外す' : 'この場所を保存する'}
            </button>
          )}
          {operatorMode && (
            <section className="panel">
              <h2>掲載状態の変更</h2>
              {selected.status === 'draft' && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await placeRequest(
                        '',
                        { operation: 'submit', slug: selected.slug },
                        true,
                      );
                      setSelected(
                        (
                          await placeRequest(
                            `?operator=1&slug=${selected.slug}`,
                            undefined,
                            true,
                          )
                        ).place,
                      );
                    })
                  }
                >
                  reviewへ送る
                </button>
              )}
              {selected.status === 'review' && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (
                        !window.confirm(
                          '実在・掲載許可・公式情報・写真の利用許可・提携表記を確認済みですか？確認した内容を公開します。',
                        )
                      )
                        return;
                      await placeRequest(
                        '',
                        {
                          operation: 'publish',
                          slug: selected.slug,
                          verified: true,
                          partnerConfirmed:
                            selected.partnerStatus === 'partner',
                        },
                        true,
                      );
                      setSelected(
                        (
                          await placeRequest(
                            `?operator=1&slug=${selected.slug}`,
                            undefined,
                            true,
                          )
                        ).place,
                      );
                    })
                  }
                >
                  確認済みとして公開する
                </button>
              )}
              {selected.status === 'published' && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await placeRequest(
                        '',
                        { operation: 'suspend', slug: selected.slug },
                        true,
                      );
                      setSelected(
                        (
                          await placeRequest(
                            `?operator=1&slug=${selected.slug}`,
                            undefined,
                            true,
                          )
                        ).place,
                      );
                    })
                  }
                >
                  掲載を停止する
                </button>
              )}
            </section>
          )}
        </article>
      ) : (
        <>
          <p>地域と過ごし方から探せます。位置情報の許可は必要ありません。</p>
          <div className="place-filters">
            <label>
              過ごし方
              <select
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
              >
                <option value="">自由に探す</option>
                {Object.entries(PLACE_INTENTS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              カテゴリ
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">すべて</option>
                {PLACE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              エリア
              <select
                value={area}
                onChange={(event) => setArea(event.target.value)}
              >
                <option value="">すべて</option>
                {[...new Set(places.map((p) => p.area))].sort().map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
          {filtered.filter((p) => !p.sponsored).map(card)}
          {filtered.some((p) => p.sponsored) && (
            <section aria-label="広告の掲載場所">
              <h2>PR・広告の掲載場所</h2>
              <p className="meta">通常の選択肢とは分けて表示しています。</p>
              {filtered.filter((p) => p.sponsored).map(card)}
            </section>
          )}
          {!filtered.length && (
            <p className="empty">
              {operatorMode
                ? '掲載候補はまだありません。'
                : 'この条件で公開されている場所はまだありません。確認できた場所から、少しずつ増やしていきます。'}
            </p>
          )}
          {cursor && (
            <button
              disabled={busy}
              onClick={() => void run(() => load(cursor, operatorMode))}
            >
              さらに場所を見る
            </button>
          )}
        </>
      )}
    </main>
  );
}
