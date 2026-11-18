import {createHash} from 'node:crypto';
import {FieldValue,type Firestore} from 'firebase-admin/firestore';
import {SERVER_ROOT} from './admin.js';
export type UsageObservation={model:string;inputTokens:number;outputTokens:number};
export type ApprovedPricing={approved:true;currency:'JPY';inputPerMillion:number;outputPerMillion:number;sourceUrl:string;checkedAt:string};
export function usageObservation(model:string,value:unknown):UsageObservation|undefined{
 if(!/^gemini-[a-zA-Z0-9._-]{1,100}$/.test(model)||!value||typeof value!=='object')return;const v=value as Record<string,unknown>,input=v.promptTokenCount,output=v.candidatesTokenCount;
 if(!Number.isSafeInteger(input)||!Number.isSafeInteger(output)||(input as number)<0||(output as number)<0||(input as number)>10000000||(output as number)>10000000)return;
 return {model,inputTokens:input as number,outputTokens:output as number};
}
export function estimatedUsageYen(value:UsageObservation,pricing?:ApprovedPricing){
 if(!pricing||pricing.approved!==true||pricing.currency!=='JPY'||![pricing.inputPerMillion,pricing.outputPerMillion].every(v=>Number.isFinite(v)&&v>=0)||typeof pricing.sourceUrl!=='string'||!pricing.sourceUrl.startsWith('https://')||!Number.isFinite(Date.parse(pricing.checkedAt)))return {status:'pricing_not_configured' as const};
 return {status:'estimate' as const,amountYen:(value.inputTokens*pricing.inputPerMillion+value.outputTokens*pricing.outputPerMillion)/1000000,invoiceVerified:false};
}
/** Numeric provider metadata only, isolated from content and analytics. Not an invoice or payment. */
export async function recordUsageObservation(db:Firestore,requestId:string,uid:string,value:UsageObservation,now=Date.now()){
 if(!/^[0-9a-f-]{36}$/i.test(requestId)||!usageObservation(value.model,{promptTokenCount:value.inputTokens,candidatesTokenCount:value.outputTokens}))throw new Error('INVALID_USAGE');
 const owner=createHash('sha256').update(uid).digest('hex'),key=createHash('sha256').update(`${requestId}:${value.model}`).digest('hex'),day=new Date(now+9*3600000).toISOString().slice(0,10),receipt=db.doc(`${SERVER_ROOT}/ai_usage_receipts/${key}`),aggregate=db.doc(`${SERVER_ROOT}/ai_usage_days/${day}_${owner}`);
 return db.runTransaction(async tx=>{const old=await tx.get(receipt);if(old.exists)return {recorded:false};tx.set(receipt,{owner,model:value.model,inputTokens:value.inputTokens,outputTokens:value.outputTokens,createdAt:new Date(now),expiresAt:new Date(now+32*86400000)});tx.set(aggregate,{owner,date:day,inputTokens:FieldValue.increment(value.inputTokens),outputTokens:FieldValue.increment(value.outputTokens),observations:FieldValue.increment(1)},{merge:true});return {recorded:true};});
}
