import {adminConfigured,serverAdmin}from'../server/admin.js';
import{requireEligibleUser,EligibilityError}from'../server/eligibility.js';
import{pushReadiness,registerPush}from'./push.js';
import{stopNotificationSettings}from'./delivery.js';
import{createSharedRateLimiter}from'../server/shared-limit.js';
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};type Res={setHeader:(n:string,v:string)=>void;status:(n:number)=>{json:(v:unknown)=>void}};
export default async function push(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!adminConfigured())return res.status(503).json({error:'PUSH_NOT_READY'});
 try{
  const deps=serverAdmin(),header=req.headers.authorization;if(typeof header!=='string'||!header.startsWith('Bearer '))return res.status(401).json({error:'LOGIN_REQUIRED'});
  if(req.method==='DELETE'){
   const user=await deps.auth.verifyIdToken(header.slice(7),true);if(user.firebase?.sign_in_provider==='anonymous'||user.firebase?.sign_in_provider==='password'&&user.email_verified!==true)return res.status(401).json({error:'LOGIN_REQUIRED'});
   return res.status(200).json(await stopNotificationSettings(deps.db,user.uid));
  }
  const user=await requireEligibleUser(header.slice(7),deps),ready=await pushReadiness(deps.db);
  if(req.method==='GET'){
   const[registration,prefs]=await Promise.all([deps.db.doc(`camellia_users/${user.uid}/admin/notification_registration`).get(),deps.db.doc(`camellia_users/${user.uid}/profile/notification_preferences`).get()]);
   const data=registration.data(),entry=data?.lastDelivery;
   const registrationId=typeof data?.recipient==='string'&&/^[a-f0-9]{64}$/.test(data.recipient)?data.recipient:null;
   const lastDelivery=entry&&['push_service_accepted','rejected','unknown'].includes(entry.state)&&typeof entry.at==='string'&&Number.isFinite(Date.parse(entry.at))?{state:entry.state,at:entry.at}:null;
   return res.status(200).json({ready:Boolean(ready),preferencesRequested:prefs.data()?.preferences?.requested===true,...(ready?{publicKey:ready.publicKey}:{}),registered:Boolean(registrationId),registrationId,lastDelivery,revision:prefs.data()?.revision??0});
  }
  if(!ready)return res.status(503).json({error:'PUSH_NOT_READY'});
  const v=req.body as Record<string,unknown>|undefined;
  if(req.method!=='POST'||!v||typeof v!=='object'||Array.isArray(v)||Buffer.byteLength(JSON.stringify(v))>4000||Object.keys(v).some(k=>!['subscription','consent','expectedRevision'].includes(k))||v.consent!==true||!Number.isSafeInteger(v.expectedRevision))return res.status(400).json({error:'INVALID_SUBSCRIPTION'});
  if(!await createSharedRateLimiter(deps.db,{},Date.now,'notification_rate_windows').take(user.uid))return res.status(429).json({error:'SLOW_DOWN'});
  return res.status(200).json(await registerPush(deps.db,user.uid,v.subscription,Number(v.expectedRevision)));
 }catch(e){if(e instanceof EligibilityError)return res.status(e.status).json({error:e.code});return res.status(e instanceof Error&&['PREFERENCES_CHANGED','PUSH_IDENTITY_CONFLICT'].includes(e.message)?409:503).json({error:'PUSH_UNAVAILABLE'});}
}
