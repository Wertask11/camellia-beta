import {schoolParkAuth} from '@/lib/schoolpark/firebase';
import type {Membership} from './model';
export async function requestMembership():Promise<Membership>{
 const user=schoolParkAuth.currentUser;if(!user||user.isAnonymous)throw new Error('記録をつなぐにはCamellia IDが必要です。');
 try{const response=await fetch('/api/camellia/membership',{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:'no-store',signal:AbortSignal.timeout(10000)});const raw=await response.json();if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error();const value=raw as Record<string,unknown>;
 if(schoolParkAuth.currentUser?.uid!==user.uid||!response.ok||typeof value.plan!=='string'||!['free','plus'].includes(value.plan)||value.priceYen!==500)throw new Error();
 return {plan:value.plan as Membership['plan'],trial:value.trial===true,paid:value.paid===true,sharingReady:false,checkoutReady:false,priceYen:500,...(typeof value.expiresAt==='string'?{expiresAt:value.expiresAt}:{})};
 }catch{throw new Error('プランを確認できませんでした。通信を確かめて、もう一度お試しください。');}
}
