import {createHash,createECDH,ECDH} from 'node:crypto';
import webpush from 'web-push';
import type {Firestore} from 'firebase-admin/firestore';
import {SERVER_ROOT} from '../server/admin.js';
import {validNotificationPreferences,safeNotificationPreview} from './preferences.js';
import type {DeliveryDriver} from './delivery.js';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
export const pushSubscriptionPath=(id:string)=>`${SERVER_ROOT}/notification_subscriptions/${id}`;
const keyBytes=(v:unknown,size:number)=>{
 if(typeof v!=='string'||!/^[-A-Za-z0-9_]+$/.test(v))throw new Error('INVALID_PUSH_KEY');
 const b=Buffer.from(v,'base64url');if(b.length!==size||b.toString('base64url')!==v)throw new Error('INVALID_PUSH_KEY');return b;
};
export function pushSubscription(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('INVALID_SUBSCRIPTION');
 const v=value as Record<string,unknown>,keys=v.keys as Record<string,unknown>|undefined;
 if(Object.keys(v).some(k=>!['endpoint','expirationTime','keys'].includes(k))||!keys||typeof keys!=='object'||Object.keys(keys).some(k=>!['p256dh','auth'].includes(k))||typeof v.endpoint!=='string'||v.endpoint.length>2000)throw new Error('INVALID_SUBSCRIPTION');
 const u=new URL(v.endpoint),host=u.hostname;
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.search||!u.pathname||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(host)&&!host.endsWith('.notify.windows.com'))throw new Error('UNSUPPORTED_PUSH_SERVICE');
 const publicKey=keyBytes(keys.p256dh,65);if(publicKey[0]!==4)throw new Error('INVALID_PUSH_KEY');ECDH.convertKey(publicKey,'prime256v1');keyBytes(keys.auth,16);
 if(v.expirationTime!==undefined&&v.expirationTime!==null&&(!Number.isSafeInteger(v.expirationTime)||Number(v.expirationTime)<=Date.now()))throw new Error('INVALID_SUBSCRIPTION');
 return {endpoint:u.href,keys:{p256dh:String(keys.p256dh),auth:String(keys.auth)}};
}
export function pushSettings(env:Record<string,string|undefined>=process.env){
 if(env.CAMELLIA_WEB_PUSH_ENABLED!=='true'||!/^[a-f0-9]{64}$/i.test(env.CAMELLIA_NOTIFICATION_DISPATCH_SECRET??''))return;
 try{
  const publicKey=env.CAMELLIA_PUSH_PUBLIC_KEY!,privateKey=env.CAMELLIA_PUSH_PRIVATE_KEY!,subject=env.CAMELLIA_PUSH_SUBJECT!;
  const pair=createECDH('prime256v1');pair.setPrivateKey(keyBytes(privateKey,32));if(!pair.getPublicKey().equals(keyBytes(publicKey,65)))return;
  if(!/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(subject))return;
  return{publicKey,privateKey,subject};
 }catch{return;}
}
export async function pushReadiness(db:Firestore,env:Record<string,string|undefined>=process.env){
 const settings=pushSettings(env);if(!settings)return;
 const[c,p]=await Promise.all([db.doc(`${SERVER_ROOT}/config/notification_delivery`).get(),db.doc(`${SERVER_ROOT}/config/retention`).get()]),cfg=c.data(),policies=p.data()?.collections;
 if(cfg?.approved!==true||cfg.enabled!==true||cfg.driver!=='web-push'||cfg.permissionReviewed!==true||typeof cfg.approvedBy!=='string'||!cfg.approvedBy||!Number.isFinite(Date.parse(cfg.approvedAt))||!Number.isSafeInteger(cfg.timeToLiveSeconds)||cfg.timeToLiveSeconds<60||cfg.timeToLiveSeconds>86400)return;
 const subs=policies?.notification_subscriptions,delivery=policies?.notification_deliveries,attempts=policies?.notification_push_attempts;
 const approved=(v:Record<string,unknown>|undefined)=>v?.approved===true&&typeof v.approvedBy==='string'&&v.approvedBy.length>0&&typeof v.approvedAt==='string'&&Number.isFinite(Date.parse(v.approvedAt));
 if(!approved(subs)||subs.mode!=='until_revoked'||!approved(delivery)||!Number.isSafeInteger(delivery.retentionMs)||delivery.retentionMs<32*86400000||!approved(attempts)||!Number.isSafeInteger(attempts.retentionMs)||attempts.retentionMs<32*86400000)return;
 return{...settings,ttl:Number(cfg.timeToLiveSeconds),retentionMs:Number(delivery.retentionMs),attemptRetentionMs:Number(attempts.retentionMs)};
}
export async function registerPush(db:Firestore,uid:string,value:unknown,expectedRevision:number){
 const ready=await pushReadiness(db);if(!ready)throw new Error('PUSH_NOT_READY');
 const subscription=pushSubscription(value),id=hash(subscription.endpoint),ref=db.doc(pushSubscriptionPath(id)),root=db.doc(`camellia_users/${uid}`),registration=db.doc(`camellia_users/${uid}/admin/notification_registration`);
 await db.runTransaction(async tx=>{
  const[owner,current,prefs,old,access]=await Promise.all([tx.get(root),tx.get(registration),tx.get(db.doc(`camellia_users/${uid}/profile/notification_preferences`)),tx.get(ref),tx.get(db.doc(`camellia_users/${uid}/admin/access`))]);
  if(!owner.exists||owner.data()?.personalDeleteInProgress||access.data()?.suspended===true||!validNotificationPreferences(prefs.data()?.preferences)||!prefs.data()!.preferences.requested||prefs.data()?.revision!==expectedRevision)throw new Error('PREFERENCES_CHANGED');
  if(old.exists&&old.data()?.uid!==uid)throw new Error('PUSH_IDENTITY_CONFLICT');
  const oldId=current.data()?.recipient;if(typeof oldId==='string'&&/^[a-f0-9]{64}$/.test(oldId)&&oldId!==id)tx.delete(db.doc(pushSubscriptionPath(oldId)));
  tx.set(ref,{uid,subscription,active:true,createdAt:old.data()?.createdAt??new Date(),updatedAt:new Date()});
  tx.set(registration,{recipient:id,permission:'granted',updatedAt:new Date()});
 });
 return{registered:true};
}
/** A durable at-most-once dispatch claim. Push-service acceptance is not proof of OS display. */
export function webPushDriver(db:Firestore,send:typeof webpush.sendNotification=webpush.sendNotification):DeliveryDriver{
 return{idempotent:true,async send(request){
  const ready=await pushReadiness(db);if(!ready||!/^[a-f0-9]{64}$/.test(request.recipient)||!/^[a-f0-9]{64}$/.test(request.key))return'rejected';
  const ref=db.doc(pushSubscriptionPath(request.recipient)),row=await ref.get(),data=row.data();if(!data?.active||typeof data.uid!=='string')return'rejected';
  const uid=data.uid,claim=db.doc(`${SERVER_ROOT}/notification_push_attempts/${hash(request.key)}`);
  const admitted=await db.runTransaction(async tx=>{
   const[old,root,prefs,reg,access,subscription]=await Promise.all([tx.get(claim),tx.get(db.doc(`camellia_users/${uid}`)),tx.get(db.doc(`camellia_users/${uid}/profile/notification_preferences`)),tx.get(db.doc(`camellia_users/${uid}/admin/notification_registration`)),tx.get(db.doc(`camellia_users/${uid}/admin/access`)),tx.get(ref)]);
   if(!root.exists||root.data()?.personalDeleteInProgress||access.data()?.suspended||!prefs.data()?.preferences?.requested||reg.data()?.recipient!==request.recipient||subscription.data()?.active!==true)return false;
   if(old.exists&&old.data()?.state!=='rejected')return false;
   tx.set(claim,{owner:hash(uid),state:'dispatching',createdAt:old.data()?.createdAt??new Date(),expiresAt:new Date(Date.now()+ready.attemptRetentionMs)});return true;
  });
  if(!admitted)return'unknown';
  let result:'delivered'|'rejected'|'unknown'='unknown';
  try{
   const subscription=pushSubscription(data.subscription),payload=JSON.stringify({...safeNotificationPreview(),key:request.key});
   await send(subscription,payload,{vapidDetails:{subject:ready.subject,publicKey:ready.publicKey,privateKey:ready.privateKey},TTL:ready.ttl,urgency:'normal',topic:hash(request.key).slice(0,32),timeout:5000});result='delivered';
  }catch(error){
   const status=error&&typeof error==='object'&&'statusCode'in error?error.statusCode:undefined;
   if([400,401,403,404,410,429].includes(Number(status)))result='rejected';
   if(status===404||status===410){await db.runTransaction(async tx=>{const current=await tx.get(db.doc(`camellia_users/${uid}/admin/notification_registration`));if(current.data()?.recipient===request.recipient)tx.delete(current.ref);tx.delete(ref);});}
  }
  await db.runTransaction(async tx=>{const reg=await tx.get(db.doc(`camellia_users/${uid}/admin/notification_registration`));tx.update(claim,{state:result,finishedAt:new Date()});if(reg.exists&&reg.data()?.recipient===request.recipient)tx.update(reg.ref,{lastDelivery:{state:result==='delivered'?'push_service_accepted':result,at:new Date().toISOString()}});});return result;
 }};
}
