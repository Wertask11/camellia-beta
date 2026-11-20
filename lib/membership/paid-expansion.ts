import{estimateAttempt}from'../server/ai-observation.js';
/** New paid expansion only. Invalid pricing never disables existing Free or legacy grants. */
export function paidExpansionReady(value:unknown,now=Date.now(),env:NodeJS.ProcessEnv=process.env){
 const v=value as Record<string,unknown>|undefined;
 if(v?.approved!==true||v.paidExpansionApproved!==true||!v.pricing||typeof v.pricing!=='object')return false;
 const prices=v.pricing as Record<string,Record<string,unknown>>;
 return [...new Set([env.GEMINI_MODEL||'gemini-3.8-flash',env.GEMINI_FALLBACK_MODEL??'gemini-3.1-flash-lite'].filter(Boolean))].every(model=>{const price=prices[model];return Number.isFinite(Date.parse(String(price?.validUntil)))&&Date.parse(String(price.validUntil))>now&&estimateAttempt({input:0,output:0,thinking:0,cached:0,total:0},price).status==='estimate';});
}
