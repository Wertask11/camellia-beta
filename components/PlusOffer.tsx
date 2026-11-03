'use client';
import {useEffect,useRef} from 'react';
import type {Membership} from '@/lib/membership/model';
import type {AnalyticsEventName} from '@/types';
export function PlusOffer({source,membership,onClose,onTrack}:{source:'place'|'partner'|'my';membership?:Membership|null;onClose:()=>void;onTrack:(name:AnalyticsEventName,props?:Record<string,string|number|boolean>)=>void}){
 const ref=useRef<HTMLDialogElement>(null),sent=useRef(false);
 useEffect(()=>{const previous=document.activeElement;const node=ref.current;node?.showModal();return()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
 useEffect(()=>{if(!sent.current){sent.current=true;onTrack('plus_offer_view',{source});}},[source,onTrack]);
 return <dialog ref={ref} className="commerce-dialog" aria-labelledby="plus-title" onCancel={e=>{e.preventDefault();onClose();}}><button className="close" onClick={onClose} aria-label="閉じる">×</button><p className="eyebrow">選択と行動を、もう少し自分らしく</p><h2 id="plus-title">Camellia Plus</h2><p className="plus-price">月額500円</p>
 <section><h3>Free · 無料</h3><p>Today、今日の一枚、メリィの基本利用、Discover、Circle、My、Placeの基本体験。Camellia IDも無料です。</p></section>
 <section><h3>Plusで広がること</h3><ul><li>希望や今日の選択を重ねた、より深いPlace提案</li><li>気持ち・したいこと・行きたい場所のパートナー共有</li><li>作成した共有の期限設定・取り消し・管理</li></ul></section>
 {membership?.plan==='plus'?<output>{membership.trial?'Plus無料試用中です。自動課金はありません。':'Plusをご利用中です。'}</output>:<p className="meta">支払いの受け付けは準備中です。いま料金は発生せず、この画面から有料加入することもありません。既存のFree機能はそのまま使えます。</p>}
 <button className="primary" disabled>支払い受付は準備中</button><button className="secondary-button" onClick={onClose}>いま使える機能に戻る</button>
 </dialog>;
}
