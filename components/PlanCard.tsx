'use client';
import {useEffect,useState} from 'react';
import {requestMembership} from '@/lib/membership/client';
import type {Membership} from '@/lib/membership/model';
import type {AnalyticsEventName} from '@/types';
import {PlusOffer} from './PlusOffer';
import {MEMBERSHIP_CHANGED} from './PlusReturnNotice';
export function PlanCard({onTrack}:{onTrack:(name:AnalyticsEventName,props?:Record<string,string|number|boolean>)=>void}){
 const [plan,setPlan]=useState<Membership>(),[error,setError]=useState(''),[offer,setOffer]=useState(false);
 useEffect(()=>{let active=true;const load=()=>void requestMembership().then(v=>{if(active){setPlan(v);setError('');}}).catch(e=>{if(active)setError(e.message);});load();window.addEventListener(MEMBERSHIP_CHANGED,load);return()=>{active=false;window.removeEventListener(MEMBERSHIP_CHANGED,load);};},[]);
 const plus=plan?.plan==='plus',loading=!plan&&!error;
 const until=plus&&plan?.expiresAt?new Date(plan.expiresAt).toLocaleDateString('ja-JP',{month:'long',day:'numeric'}):'';
 const badge=loading?'プランを確認しています…':plus?(plan?.trial?'いまのプラン：Plus（無料試用中）':'いまのプラン：Plus（月500円）'):'いまのプラン：Free（無料）';
 return <section className={`panel plan-card${plus?' plan-card-plus':''}`}><p className="eyebrow">Camelliaのプラン</p><p className={`plan-badge${plus?' plan-badge-plus':''}`} aria-live="polite">{badge}</p><h2>{plus?plan?.trial?'Camellia Plus · 無料試用':'Camellia Plus':'Freeで、選ぶ・行動する'}</h2>{plus?<p>{plan?.trial?'Plusを無料で試しています。自動で課金されることはありません。':'Plusをご利用中です。'}{until?`${until}まで有効です${plan?.paid?plan.cancelAtPeriodEnd?'（解約済みのため、この日で終了します。それ以降の請求はありません）':'（自動で更新されます）':''}。`:''}</p>:<p>今日の自分から、選択肢を見つけて、自分で選ぶ。Camellia IDは無料です。</p>}{error&&<p className="meta">プランを確認できませんでした。Freeの基本機能は使えます。</p>}{!loading&&<button className="secondary-button" onClick={()=>setOffer(true)}>{plus?(plan?.paid?'Plusの内容・お支払いの管理':'Plusの内容を見る'):'Plusで広がる体験を見る · 月500円'}</button>}{offer&&<PlusOffer source="my" membership={plan} onClose={()=>setOffer(false)} onTrack={onTrack}/>}</section>;
}
