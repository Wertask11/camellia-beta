import {FieldPath}from'firebase-admin/firestore';
import {createHash,timingSafeEqual}from'node:crypto';
import {adminConfigured,serverAdmin,SERVER_ROOT}from'../../lib/server/admin.js';
import {pushReadiness,webPushDriver}from'../../lib/notifications/push.js';
import {NotificationDelivery}from'../../lib/notifications/delivery.js';
import{NOTIFICATION_TOPICS,type NotificationPreferences}from'../../lib/notifications/preferences.js';
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};type Res={setHeader:(n:string,v:string)=>void;status:(n:number)=>{json:(v:unknown)=>void}};
export const maxDuration=60;
/** Operator/scheduler only. No schedule is installed or started by this endpoint. */
export default async function dispatch(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const secret=process.env.CAMELLIA_NOTIFICATION_DISPATCH_SECRET,header=req.headers.authorization;
 if(!secret||!/^[a-f0-9]{64}$/i.test(secret)||typeof header!=='string'||!timingSafeEqual(createHash('sha256').update(header).digest(),createHash('sha256').update(`Bearer ${secret}`).digest()))return res.status(401).json({error:'UNAUTHORIZED'});
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 if(!adminConfigured())return res.status(503).json({error:'PUSH_NOT_READY'});
 const v=req.body as Record<string,unknown>|undefined;
 if(!v||typeof v!=='object'||Array.isArray(v)||Buffer.byteLength(JSON.stringify(v))>300||Object.keys(v).some(k=>!['topic','after'].includes(k))||typeof v.topic!=='string'||!Object.hasOwn(NOTIFICATION_TOPICS,v.topic)||v.after!==undefined&&(typeof v.after!=='string'||!/^[a-f0-9]{64}$/.test(v.after)))return res.status(400).json({error:'INVALID_DISPATCH'});
 try{
  const{db}=serverAdmin(),ready=await pushReadiness(db);if(!ready)return res.status(503).json({error:'PUSH_NOT_READY'});
  let q=db.collection(`${SERVER_ROOT}/notification_subscriptions`).orderBy(FieldPath.documentId()).limit(50);if(v.after)q=q.startAfter(v.after);
  const rows=await q.get(),delivery=new NotificationDelivery(db,webPushDriver(db),Date.now,ready.retentionMs),counts:Record<string,number>={};
  const started=Date.now();let last:string|undefined,paused=false;
  for(const row of rows.docs){if(Date.now()-started>20000){paused=true;break;}last=row.id;const d=row.data();if(d.active!==true||typeof d.uid!=='string')continue;const result=await delivery.send(d.uid,v.topic as NotificationPreferences['topics'][number]);counts[result.state]=(counts[result.state]??0)+1;}
  return res.status(200).json({counts,nextCursor:paused||rows.size===50?last??null:null,notice:'delivered means push-service acceptance; OS display is unverified'});
 }catch{return res.status(503).json({error:'DISPATCH_UNAVAILABLE'});}
}
