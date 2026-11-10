/* oxlint-disable next/no-img-element -- operator-reviewed external photos use native lazy loading without an image proxy */
'use client';
import {recordPublicPlaceMetric} from '@/lib/place/metric-client';
import {PlaceComparison} from '@/components/PlaceComparison';
import {matchesPlaceConditions,type PlaceConditions} from '@/lib/place/conditions';
import {PLACE_SECTORS,availableBenefits,type PlaceSector} from '@/lib/place/details';
import {requestMembership} from '@/lib/membership/client';
import { useEffect, useState,useRef,type SetStateAction } from 'react';
import { placeRequest } from '@/lib/place/client';
import { PLACE_CATEGORIES, PLACE_INTENTS, type Place } from '@/lib/place/model';
import {CHOICE_ACTION_FLOW} from '@/lib/features';
import {localPlaceIntents,rankPlaces,type PlaceIntent} from '@/lib/place/recommendation';
import type { AnalyticsEventName,CamelliaState } from '@/types';
type Props = {
  initialIntent?:PlaceIntent;
  onOpenPlus?:()=>void;
  contextState?:CamelliaState;
  onSelectPlace?:(place:Place,demo:boolean)=>void;
  onSharePlace?:(place:Place,demo:boolean)=>void;
  onPersonalization?:(enabled:boolean)=>void;
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
  initialIntent,
  contextState,onSelectPlace,onSharePlace,onPersonalization,onOpenPlus,
  demoPlaces,
  onBack,
  onTrack,
  initialSlug,
  savedOnly = false,
}: Props) {
  const isDemo = Boolean(demoPlaces);
  const viewReceipt=useRef({slug:'',id:''});
  const [conditions,setConditions]=useState<PlaceConditions>({});
  const [compareIds,setCompareIds]=useState<string[]>([]),[comparison,setComparison]=useState<Place[]>(),[enhanced,setEnhanced]=useState(false),[plus,setPlus]=useState(false);
  const changeConditions=(value:SetStateAction<PlaceConditions>)=>{setConditions(value);setCompareIds([]);};
  const emptyReview={realConfirmed:false,listingPermission:false,photoPermission:false,detailsConfirmed:false,listingEvidence:'',photoEvidence:''};
  const [review,setReview]=useState(emptyReview);
  useEffect(()=>{let active=true;void requestMembership().then(plan=>{if(active)setPlus(plan.plan==='plus');}).catch(()=>{});return()=>{active=false;};},[]);

  const [personalized,setPersonalized]=useState(contextState?.profile.placePersonalization===true);
  const [places, setPlaces] = useState<Place[]>([]),
    [selected, setSelected] = useState<Place>(),
    [cursor, setCursor] = useState<string>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [category, setCategory] = useState(''),
    [area, setArea] = useState(''),
    [intent, setIntent] = useState<string>(initialIntent??''),
    [operator, setOperator] = useState(false),
    [canPublish,setCanPublish]=useState(false),
    [metricCounts,setMetricCounts]=useState<Record<string,number>>(),
    [agreesFree,setAgreesFree]=useState(false),
    [operatorMode, setOperatorMode] = useState(false);
  useEffect(()=>{queueMicrotask(()=>{setReview(emptyReview);setMetricCounts(undefined);setAgreesFree(false);});},[selected?.slug,selected?.updatedAt]); // oxlint-disable-line react-hooks/exhaustive-deps -- every publication requires fresh review
  useEffect(()=>{if(isDemo||operatorMode||!selected){viewReceipt.current={slug:'',id:''};return;}if(viewReceipt.current.slug!==selected.slug)viewReceipt.current={slug:selected.slug,id:crypto.randomUUID()};recordPublicPlaceMetric(selected.slug,'detail',viewReceipt.current.id);},[selected,isDemo,operatorMode]);
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
        if (active){setOperator(data.operator === true);setCanPublish(data.canPublish===true);}
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
    if (!operatorMode && (CHOICE_ACTION_FLOW||!isDemo))
      onTrack('place_view', { place_id: place.slug,catalog:isDemo?'demo':'published' });
    const url = new URL(location.href);
    url.searchParams.set('open', isDemo ? 'place-demo' : 'place');
    url.searchParams.set('place', place.slug);
    history.replaceState({}, '', url.pathname + url.search);
  };
  const filtered = rankPlaces(places.filter(
    (place) =>
      matchesPlaceConditions(place,conditions) &&
      (!savedOnly || place.saved === true) &&
      (!category || place.category === category) &&
      (!area || place.area === area) &&
      (!intent || place.recommendedFor.includes(intent)),
  ),[...(intent?[intent as PlaceIntent]:[]),...(personalized&&contextState?localPlaceIntents(contextState):[])]);
  useEffect(()=>{onTrack('place_recommendation_view',{catalog:isDemo?'demo':'published',personalized});},[isDemo,personalized,onTrack]);
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
        onClick={() => {onTrack(event, { place_id: selected!.slug });recordPublicPlaceMetric(selected!.slug,event==='place_booking_open'?'booking':event==='place_map_open'?'map':event==='place_contact_open'?'contact':'official');}}
      >
        {label} ↗
      </a>
    ) : null;
  const card = (place: Place) => (
    <article key={place.id}><button className="place-card" onClick={() => open(place)}>
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
    </button><label className="privacy-choice"><input type="checkbox" checked={compareIds.includes(place.slug)} disabled={!compareIds.includes(place.slug)&&compareIds.length>=3} onChange={e=>setCompareIds(ids=>e.target.checked?[...ids,place.slug]:ids.filter(id=>id!==place.slug))}/>候補を比べる</label></article>
  );
  return (
    <main className="screen place-screen">
      {comparison&&<PlaceComparison places={comparison} enhanced={enhanced} onClose={()=>setComparison(undefined)}/>}

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
          <p>実在の掲載店舗・施設ではありません。</p><details><summary>掲載イメージについて</summary><p>写真は雰囲気を伝える参考画像です。{onSelectPlace?'予約や地図は利用できません。気になる体験のイメージとしてMyへ残せます。':'予約・地図・保存は利用できません。'}確認した実在の場所に、後から差し替えられます。</p></details>
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
      {!selected&&<section className="place-intents"><h2>今日は、どんな時間にしたい？</h2><p className="meta">場所から選ぶ、今日の小さな一歩。</p><div className="quick-inputs">{Object.entries(PLACE_INTENTS).map(([key,label])=><button key={key} aria-pressed={intent===key} onClick={()=>{setIntent(intent===key?'':key);setCompareIds([]);}}>{label}</button>)}</div>{contextState&&<label className="privacy-choice"><input type="checkbox" checked={personalized} onChange={e=>{setPersonalized(e.target.checked);onPersonalization?.(e.target.checked);}}/>今日のCheckと選んだ行動を、候補の並び替えに使う<small>この端末内で処理します。会話・月経・My Treeは使わず、店舗へ渡しません。</small></label>}</section>}
      {onOpenPlus&&<button className="text-button" onClick={onOpenPlus}>Plusで広がるPlaceの体験を見る · 月500円</button>}
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
          {operatorMode&&<section className="panel"><h2>基本掲載・無料実証</h2><p>基本情報・体験紹介・既存の予約導線・基本集計は無料です。店舗特典は任意で、自動的に有料へ移行しません。有料オプション・来店確認は未提供です。</p><label className="privacy-choice"><input type="checkbox" checked={agreesFree} onChange={e=>setAgreesFree(e.target.checked)}/>この無料実証の条件を確認しました</label><button disabled={!agreesFree||busy} onClick={()=>void run(async()=>{await placeRequest('',{operation:'acceptFreePilot',slug:selected.slug,agrees:true},true);setError('無料実証の確認を記録しました。料金は発生しません。');})}>無料実証の確認を記録する</button><button disabled={busy} onClick={()=>void run(async()=>{const data=await placeRequest(`?metrics=${selected.slug}`,undefined,true);setMetricCounts(data.counts);})}>このPlaceの操作集計を見る</button>{metricCounts&&<><p className="meta">直近30日。閲覧・クリック等の送信数で、来店・予約成立ではありません。</p>{Object.entries(metricCounts).map(([key,count])=><p key={key}>{{detail:'詳細閲覧',official:'公式リンク',booking:'予約リンク',map:'地図リンク',contact:'問い合わせリンク'}[key]??key}：{count}</p>)}</>}</section>}
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
<p>{selected.experience||selected.description}</p>{selected.services?.length?<p>体験・サービス：{selected.services.join("・")}</p>:null}{selected.informationCheckedAt&&<p className="meta">掲載情報の確認日：{new Date(selected.informationCheckedAt).toLocaleDateString("ja-JP")}</p>}
          <p>{reason(selected)}</p>
          {!operatorMode&&onSelectPlace&&<div className="choice-bridge"><button className="primary" onClick={()=>{onTrack('place_selected',{place_id:selected.slug,catalog:isDemo?'demo':'published'});onSelectPlace(selected,isDemo);}}>{isDemo?'こんな体験をしてみたい':'ここへ行ってみたい'}</button>{onSharePlace&&<button className="secondary-button" onClick={()=>onSharePlace(selected,isDemo)}>パートナーに伝える</button>}{isDemo&&<p className="meta">選ぶのは体験イメージです。予約や実在店舗への申し込みにはなりません。</p>}</div>}
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
          {availableBenefits(selected).map(b=><section className="panel" key={b.id}><h3>{b.title}</h3><p>{b.conditions}</p><p>{b.eligible==='plus'?'Plus会員が対象':'利用条件を満たす方が対象'}</p><p className="meta">有効期限：{new Date(b.validUntil).toLocaleDateString('ja-JP')}</p></section>)}
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
                {external('問い合わせ', selected.contactUrl??'', 'place_contact_open')}
                {selected.phone&&<a href={`tel:${selected.phone.replace(/[^+0-9]/g,'')}`} onClick={()=>{onTrack('place_contact_open',{place_id:selected.slug});recordPublicPlaceMetric(selected.slug,'contact');}}>電話で問い合わせる ↗</a>}
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
              {selected.status==='review'&&canPublish&&<section aria-label="掲載前の確認"><p>実在・掲載許可・写真の利用権・営業情報を別々に確認します。証跡は運営だけが閲覧します。</p>{([['realConfirmed','実在を確認した'],['listingPermission','掲載許可を確認した'],['photoPermission','写真の利用許可を確認した'],['detailsConfirmed','料金・営業時間・体験・連絡先を確認した']] as const).map(([key,label])=><label className="privacy-choice" key={key}><input type="checkbox" checked={review[key]} onChange={e=>setReview(r=>({...r,[key]:e.target.checked}))}/>{label}</label>)}<label>掲載許可の確認記録<input maxLength={300} value={review.listingEvidence} onChange={e=>setReview(r=>({...r,listingEvidence:e.target.value}))}/></label><label>写真利用許可の確認記録<input maxLength={300} value={review.photoEvidence} onChange={e=>setReview(r=>({...r,photoEvidence:e.target.value}))}/></label></section>}
              {selected.status === 'review' && canPublish && (
                <button
                  disabled={busy||!review.realConfirmed||!review.listingPermission||!review.photoPermission||!review.detailsConfirmed||!review.listingEvidence.trim()||!review.photoEvidence.trim()}
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
                          review,
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
          <details className="place-condition-controls"><summary>条件を調整する（エリア・料金・時間など）</summary><div className="place-filters">
            <label>
              過ごし方
              <select
                value={intent}
                onChange={(event) => {setIntent(event.target.value);setCompareIds([]);}}
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
                onChange={(event) => {setCategory(event.target.value);setCompareIds([]);}}
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
                onChange={(event) => {setArea(event.target.value);setCompareIds([]);}}
              >
                <option value="">すべて</option>
                {[...new Set(places.map((p) => p.area))].sort().map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
          <section className="place-conditions" aria-label="利用条件"><h2>譲れない条件から、候補を絞る</h2><div className="place-filters"><label>分野<select aria-label="Placeの分野" value={conditions.sector??''} onChange={e=>changeConditions(c=>({...c,sector:(e.target.value||undefined) as PlaceSector|undefined}))}><option value="">すべて</option>{Object.entries(PLACE_SECTORS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>表示料金の上限<select aria-label="表示料金の上限" value={conditions.maxBudgetYen??''} onChange={e=>changeConditions(c=>({...c,maxBudgetYen:e.target.value?Number(e.target.value):undefined}))}><option value="">指定しない</option>{[1000,3000,5000,10000].map(v=><option key={v} value={v}>{v.toLocaleString()}円まで</option>)}</select></label><label>所要時間<select aria-label="Placeの所要時間" value={conditions.maxMinutes??''} onChange={e=>changeConditions(c=>({...c,maxMinutes:e.target.value?Number(e.target.value):undefined}))}><option value="">指定しない</option>{[30,60,120].map(v=><option key={v} value={v}>{v}分以内</option>)}</select></label><label>サービス<select aria-label="Placeのサービス" value={conditions.service??''} onChange={e=>changeConditions(c=>({...c,service:e.target.value||undefined}))}><option value="">指定しない</option>{[...new Set(places.flatMap(p=>p.services??[]))].sort().map(v=><option key={v}>{v}</option>)}</select></label></div><label className="privacy-choice"><input type="checkbox" checked={Boolean(conditions.walkIn)} onChange={e=>changeConditions(c=>({...c,walkIn:e.target.checked}))}/>予約なしで利用できる候補</label><label className="privacy-choice"><input type="checkbox" checked={Boolean(conditions.openAt)} onChange={e=>changeConditions(c=>({...c,openAt:e.target.checked?new Date():undefined}))}/>登録された営業時間内の候補</label><p className="meta">情報が不明な候補は、指定条件に一致したとは扱いません。臨時休業・最終料金・予約条件は公式情報をご確認ください。</p></section>
          </details><div className="quick-inputs"><button disabled={compareIds.length<2} onClick={()=>{setEnhanced(false);setComparison(places.filter(p=>compareIds.includes(p.slug)));}}>選んだ候補を比較する（{compareIds.length}/3）</button>{onOpenPlus&&<button disabled={compareIds.length<2} onClick={()=>{if(!plus||!personalized){onOpenPlus();return;}if(isDemo){setError('デモではPlusの実提案は利用できません。掲載された事実から比較できます。');return;}void run(async()=>{const result=await placeRequest('',{operation:'recommendation',compareSlugs:compareIds,intents:contextState?localPlaceIntents(contextState):[]});setEnhanced(true);setComparison(result.places);});}}>Plusのパーソナル比較</button>}</div>
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
                : cursor?'読み込んだ候補には条件に合う場所がありません。「さらに場所を見る」で続きも確認できます。':'この条件で公開されている場所はまだありません。条件は自動では緩めません。'}
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
