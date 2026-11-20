import{createHash}from'node:crypto';
import{FieldPath,type Firestore}from'firebase-admin/firestore';
import{billingRoot,type BillingMode}from'./scope.js';
import{SERVER_ROOT}from'../server/admin.js';
import{approvedRetention}from'../server/retention-policy.js';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export class BillingAnalyticsError extends Error{}
const requireState=(v:unknown,code:string)=>{if(!v)throw new BillingAnalyticsError(code);};
export const billingAnalyticsPreferencePath=(uid:string,mode:BillingMode='live')=>`${billingRoot(mode)}/billing_analytics_preferences/${hash(uid)}`;
/** A transport receipt is not proof of arrival in PostHog or of a payment. */
export type BillingAnalyticsDriver=(payload:Record<string,unknown>)=>Promise<number>;
export function billingAnalyticsPayload(v:Record<string,unknown>,now=Date.now()){
 if(v.attributionVersion!=='checkout_v1'||v.event!=='plus_complete'||!uuid(v.insertId)||!Number.isFinite(v.profileEpoch)||typeof v.customerBindingId!=='string'||!/^[a-f0-9]{64}$/.test(v.customerBindingId)||typeof v.ownerHash!=='string'||!/^[a-f0-9]{64}$/.test(v.ownerHash)||typeof v.distinctId!=='string'||!v.distinctId.startsWith('camellia_')||!uuid(v.distinctId.slice(9))||!Number.isFinite(Date.parse(String(v.timestamp)))||Date.parse(String(v.timestamp))>now||Date.parse(String(v.consentUntil))<=now||!Number.isFinite(Date.parse(String(v.consentUntil)))||!Number.isFinite(Date.parse(String(v.consentFrom)))||Date.parse(String(v.timestamp))<Date.parse(String(v.consentFrom))||Date.parse(String(v.timestamp))>Date.parse(String(v.consentUntil)))return;
 const p=v.properties as Record<string,unknown>|undefined;if(!p||p.amount!==500||p.currency!=='JPY'||Object.keys(p).some(k=>!['amount','currency'].includes(k)))return;
 return{event:'plus_complete',timestamp:v.timestamp,properties:{distinct_id:v.distinctId,$insert_id:v.insertId,amount:500,currency:'JPY',event_schema:3,source:'server_verified_payment',$process_person_profile:false}};
}
const approvedDestination=(v:Record<string,unknown>|undefined)=>v?.approved===true&&v.enabled===true&&v.privacyReviewed===true&&v.projectId===594848&&v.host==='https://us.i.posthog.com'&&typeof v.approvedBy==='string'&&v.approvedBy.length>0&&typeof v.approvedAt==='string'&&Number.isFinite(Date.parse(v.approvedAt));
export async function billingAnalyticsReady(db:Firestore,env:Record<string,string|undefined>=process.env){
 if(env.VERCEL_ENV==='preview'||env.CAMELLIA_BILLING_ANALYTICS_ENABLED!=='true'||!/^phc_[A-Za-z0-9]+$/.test(env.CAMELLIA_POSTHOG_PROJECT_TOKEN??''))return false;
 const[c,r]=await Promise.all([db.doc(`${SERVER_ROOT}/config/billing_analytics`).get(),db.doc(`${SERVER_ROOT}/config/retention`).get()]);const v=c.data();
 return approvedDestination(v)&&approvedRetention(r.data(),['billing_analytics_outbox']);
}
export function billingAnalyticsHttpDriver(env:Record<string,string|undefined>=process.env,send:typeof fetch=fetch):BillingAnalyticsDriver{
 return async payload=>{if(!/^phc_[A-Za-z0-9]+$/.test(env.CAMELLIA_POSTHOG_PROJECT_TOKEN??''))throw new BillingAnalyticsError('ANALYTICS_NOT_READY');const r=await send('https://us.i.posthog.com/batch/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:env.CAMELLIA_POSTHOG_PROJECT_TOKEN,batch:[payload]}),redirect:'error',signal:AbortSignal.timeout(8000)});await r.body?.cancel();return r.status;};
}
export class BillingAnalyticsDispatcher{
 constructor(private db:Firestore,private driver:BillingAnalyticsDriver,private now=Date.now){}
 private collection(){return this.db.collection(`${SERVER_ROOT}/billing_analytics_outbox`);}
 private async rows(after?:string){requireState(after===undefined||/^[a-f0-9]{64}$/.test(after),'INVALID_CURSOR');let q=this.collection().orderBy(FieldPath.documentId()).limit(20);if(after)q=q.startAfter(after);return q.get();}
 async plan(after?:string){
  requireState(await billingAnalyticsReady(this.db),'ANALYTICS_NOT_READY');const rows=await this.rows(after),cfg=await this.db.doc(`${SERVER_ROOT}/config/billing_analytics`).get(),retention=await this.db.doc(`${SERVER_ROOT}/config/retention`).get();
  const digest=hash(JSON.stringify({config:cfg.data(),retention:retention.data()?.collections?.billing_analytics_outbox,rows:rows.docs.map(d=>[d.id,d.updateTime.seconds,d.updateTime.nanoseconds])}));
  return{digest,rows:rows.docs.map(d=>d.id),scanned:rows.size,pending:rows.docs.filter(d=>d.data().status==='pending').length,states:rows.docs.reduce((counts:Record<string,number>,d)=>{const state=['pending','processing','suppressed','http_accepted','http_rejected','unknown'].includes(d.data().status)?d.data().status:'unrecognized';counts[state]=(counts[state]??0)+1;return counts;},{}),nextCursor:rows.size===20?rows.docs.at(-1)!.id:null};
 }
 async dispatch(after:string|undefined,approvedDigest:string){
  const plan=await this.plan(after);requireState(plan.digest===approvedDigest,'ANALYTICS_PLAN_CHANGED');const counts:Record<string,number>={};let last:string|undefined;const started=this.now();
  for(const id of plan.rows){if(this.now()-started>20000)break;last=id;const ref=this.collection().doc(id);
   const packet=await this.db.runTransaction(async tx=>{
    const row=await tx.get(ref),v=row.data();if(!v||v.status!=='pending')return;
    const owner=typeof v.ownerHash==='string'&&/^[a-f0-9]{64}$/.test(v.ownerHash)?v.ownerHash:undefined;
    const[c,r,pref]=await Promise.all([tx.get(this.db.doc(`${SERVER_ROOT}/config/billing_analytics`)),tx.get(this.db.doc(`${SERVER_ROOT}/config/retention`)),...(owner?[tx.get(this.db.doc(`${SERVER_ROOT}/billing_analytics_preferences/${owner}`))]:[])]);
    // The fresh readiness check preserves an emergency stop between batches. No receipt means no duplicate retry.
    if(process.env.CAMELLIA_BILLING_ANALYTICS_ENABLED!=='true'||!approvedDestination(c.data())||!approvedRetention(r.data(),['billing_analytics_outbox']))return;
    const payload=billingAnalyticsPayload(v,this.now());
    const binding=payload?await tx.get(this.db.doc(`${SERVER_ROOT}/billing_customers/${v.customerBindingId}`)):undefined,uid=binding?.data()?.uid;const account=typeof uid==='string'&&/^[^/\\]{1,128}$/.test(uid)?await tx.get(this.db.doc(`camellia_users/${uid}`)):undefined;
    const sameProfile=typeof uid==='string'&&hash(uid)===v.ownerHash&&account?.exists&&account.data()?.personalDeleteInProgress!==true&&account.createTime?.toMillis()===v.profileEpoch&&binding?.data()?.analyticsProfileEpoch===v.profileEpoch&&`camellia_${binding?.data()?.analyticsProfileId}`===v.distinctId;
    if(!payload||!sameProfile||pref?.data()?.disabled===true){tx.update(ref,{status:'suppressed',suppressedAt:new Date(this.now()),reason:pref?.data()?.disabled===true?'opt_out':!sameProfile?'owner_record_changed':'invalid_or_expired_attribution'});return;}
    tx.update(ref,{status:'processing',attemptedAt:new Date(this.now())});return payload;
   });
   if(!packet){counts.skipped=(counts.skipped??0)+1;continue;}
   let state='unknown',status:number|undefined;try{status=await this.driver(packet);state=status>=200&&status<300?'http_accepted':'http_rejected';}catch{/* No provider detail or token in logs. */}
   await this.db.runTransaction(async tx=>{const row=await tx.get(ref);if(row.data()?.status==='processing')tx.update(ref,{status:state,...(status!==undefined?{httpStatus:status}:{}),finishedAt:new Date(this.now())});});counts[state]=(counts[state]??0)+1;
  }
  return{counts,nextCursor:last&&last!==plan.rows.at(-1)?last:plan.nextCursor,notice:'HTTP acceptance only; actual ingestion is unverified. Unknown/rejected/processing are never automatically retried.'};
 }
}
