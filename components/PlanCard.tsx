'use client';
import {useEffect,useState} from 'react';
import {requestMembership} from '@/lib/membership/client';
import type {Membership} from '@/lib/membership/model';
import type {AnalyticsEventName} from '@/types';
import {PlusOffer} from './PlusOffer';
export function PlanCard({onTrack}:{onTrack:(name:AnalyticsEventName,props?:Record<string,string|number|boolean>)=>void}){
 const [plan,setPlan]=useState<Membership>(),[error,setError]=useState(''),[offer,setOffer]=useState(false);
 useEffect(()=>{let active=true;void requestMembership().then(v=>{if(active)setPlan(v);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 return <section className="panel plan-card"><p className="eyebrow">Camelliaのプラン</p><h2>{plan?.plan==='plus'?plan.trial?'Camellia Plus · 無料試用':'Camellia Plus':'無料で、選ぶ・行動する'}</h2>{plan?.billingMode==='test'&&<p className="meta">Stripeテストの権利を確認中です。本番の有料契約ではありません。</p>}<p>今日の自分から、選択肢を見つけて、自分で選ぶ。Camellia IDは無料です。</p>{error&&<p className="meta">プランを確認できませんでした。無料の基本機能は使えます。</p>}<button className="secondary-button" onClick={()=>setOffer(true)}>Plusで広がる体験を見る · 月500円</button>{offer&&<PlusOffer source="my" membership={plan} onClose={()=>setOffer(false)} onTrack={onTrack}/>}</section>;
}
