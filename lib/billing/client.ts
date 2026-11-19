import {schoolParkAuth} from '../schoolpark/firebase';
import {billingAnalyticsProfileId} from '../analytics/posthog';
export type BillingStatus={ready:boolean;customer:boolean;priceYen:500;termsVersion?:string;disclosureVersion?:string;termsUrl?:string;disclosureUrl?:string;pendingRequestId?:string};
export async function billingRequest(operation:'status'|'checkout'|'portal'|'history',input?:Record<string,unknown>){
 const user=schoolParkAuth.currentUser;
 if(!user||user.isAnonymous)throw new Error('支払いに使ったCamellia IDで確認してください。記録の引き継ぎは不要です。');
 const r=await fetch('/api/camellia/billing',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify({operation,...(input?{input}: {})}),cache:'no-store',signal:AbortSignal.timeout(25000)});
 if(schoolParkAuth.currentUser?.uid!==user.uid)throw new Error('アカウントが変わりました。画面を開き直してください。');
 const raw=await r.json();if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('手続きを確認できませんでした。');const value=raw as Record<string,unknown>;
 if(!r.ok)throw new Error(value.error==='BILLING_NOT_READY'?(operation==='checkout'?'新しい支払いの受付は準備中です。この操作からの申し込みは開始していません。':'支払い管理を今は開けません。既存の支払い・契約がないという意味ではありません。時間をおいてもう一度確認してください。'):value.error==='EXISTING_PLUS'||value.error==='EXISTING_SUBSCRIPTION'?'すでにPlusまたは無料体験が有効です。Myで現在のプランをご確認ください。':value.error==='CHECKOUT_PENDING'||value.error==='CHECKOUT_REVIEW_REQUIRED'?'前の支払い手続きを確認中です。重ねて購入せず、時間をおいて同じ手続きを確認してください。':'手続きの状態を確認できませんでした。再購入せず、同じ画面からもう一度確認してください。');
 if(operation==='status'){
  if(typeof value.ready!=='boolean'||typeof value.customer!=='boolean'||value.priceYen!==500)throw new Error('プランを確認できませんでした。');
  for(const key of ['termsUrl','disclosureUrl'])if(value[key]!==undefined&&(typeof value[key]!=='string'||new URL(value[key]).origin!==location.origin))throw new Error('料金の案内を確認できませんでした。');
 }
 return value;
}
export type BillingInvoice={status:string|null;amountPaidYen:number|null;createdAt:string};
export function billingHistory(value:Record<string,unknown>):{invoices:BillingInvoice[];more:boolean}{
 if(!Array.isArray(value.invoices)||value.invoices.length>12||typeof value.more!=='boolean')throw new Error('支払い履歴を確認できませんでした。');
 const invoices=value.invoices.map(item=>{const v=item as BillingInvoice;if(!v||typeof v!=='object'||!['draft','open','paid','uncollectible','void',null].includes(v.status)||!(v.amountPaidYen===null||Number.isSafeInteger(v.amountPaidYen)&&v.amountPaidYen>=0)||typeof v.createdAt!=='string'||!Number.isFinite(Date.parse(v.createdAt)))throw new Error('支払い履歴を確認できませんでした。');return {status:v.status,amountPaidYen:v.amountPaidYen,createdAt:v.createdAt};});
 return {invoices,more:value.more};
}
export async function checkout(status:BillingStatus,requestId:string){
 const analyticsProfileId=billingAnalyticsProfileId();
 const result=await billingRequest('checkout',{requestId,consent:true,termsVersion:status.termsVersion,disclosureVersion:status.disclosureVersion,...(analyticsProfileId?{analyticsProfileId}:{})});
 return billingRedirect(result.url,'checkout.stripe.com');
}
export function billingRedirect(value:unknown,hostname:string){
 const u=new URL(String(value));if(u.protocol!=='https:'||u.hostname!==hostname||u.username||u.password||u.port)throw new Error('支払い先を確認できませんでした。');
 window.location.assign(u.href);
}

/** Stops only future server-side payment conversion delivery; it never cancels billing. */
export async function stopPaymentAnalytics(){const user=schoolParkAuth.currentUser;if(!user||user.isAnonymous)throw new Error('Camellia IDで確認してください。');const r=await fetch('/api/camellia/billing?analytics=stop',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:'{}',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok||schoolParkAuth.currentUser?.uid!==user.uid)throw new Error('支払い完了の計測を停止できませんでした。通信を確認してお試しください。');}
