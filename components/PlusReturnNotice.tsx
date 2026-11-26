'use client';
import {useEffect,useState} from 'react';
import {requestMembership} from '@/lib/membership/client';
/** Fired after the plan may have changed, so every plan display reloads it from the server. */
export const MEMBERSHIP_CHANGED='camellia-membership-changed';
/** Read once when the app loads, before other screens rewrite the address. Stripe sends people back with ?plus=success|cancel. */
let pendingReturn=(()=>{try{const value=new URL(location.href).searchParams.get('plus');return value==='success'||value==='cancel'?value:undefined;}catch{return undefined;}})();
type Phase='checking'|'done'|'slow'|'cancel';
const TEXT:Record<Phase,string>={
 checking:'お支払いを確認しています。この画面のままお待ちください。',
 done:'お支払いを確認しました。Camellia Plusが使えるようになりました。',
 slow:'お支払いの反映に時間がかかっています。数分後にMy→Camelliaのプランで確認してください。もう一度申し込む必要はありません。',
 cancel:'お申し込みは完了していません。料金は発生していません。',
};
/** After Stripe Checkout: the webhook may arrive a few seconds later, so wait for the server to confirm Plus instead of showing Free. */
export function PlusReturnNotice(){
 const [initialReturn]=useState(pendingReturn);
 const [phase,setPhase]=useState<Phase|undefined>(initialReturn==='cancel'?'cancel':initialReturn==='success'?'checking':undefined);
 useEffect(()=>{
  if(!initialReturn)return;
  pendingReturn=undefined;
  try{const url=new URL(location.href);url.searchParams.delete('plus');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}catch{/* The notice still shows. */}
  if(initialReturn!=='success')return;
  let active=true,tries=0,timer:ReturnType<typeof setTimeout>|undefined;
  const check=()=>{tries++;void requestMembership().then(plan=>plan.plan==='plus'&&plan.paid).catch(()=>false).then(paid=>{
   if(!active)return;
   if(paid){setPhase('done');window.dispatchEvent(new Event(MEMBERSHIP_CHANGED));return;}
   if(tries>=12){setPhase('slow');window.dispatchEvent(new Event(MEMBERSHIP_CHANGED));return;}
   timer=setTimeout(check,2500);
  });};
  check();
  return()=>{active=false;if(timer)clearTimeout(timer);};
 },[initialReturn]);
 if(!phase)return null;
 return <output className="panel plus-return" aria-live="polite"><p>{TEXT[phase]}</p>{phase!=='checking'&&<button className="text-button" onClick={()=>setPhase(undefined)}>閉じる</button>}</output>;
}
