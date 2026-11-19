import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
import type {Firestore} from 'firebase-admin/firestore';
import {SERVER_ROOT} from '../server/admin.js';
export const FREE_DAILY_LIMIT=30; // Owner decision 2026-11-16: one person/day maximum30. Anonymous enforcement is device + network, not proof of a person.
export const FREE_COOKIE='__Host-camellia-free-v1';
export const freeDay=(time:number)=>new Date(time+9*3600000).toISOString().slice(0,10);
export const freeDayEnd=(time:number)=>Date.parse(freeDay(time)+'T00:00:00+09:00')+86400000;
const digest=(secret:string,value:string)=>createHmac('sha256',secret).update('camellia-free-v1:'+value).digest('hex');
type Headers=Record<string,string|string[]|undefined>;
const scalar=(v:string|string[]|undefined)=>typeof v==='string'?v:'';
export function requireFreeOrigin(headers:Headers){
 const origin=scalar(headers.origin),host=scalar(headers.host);
 let url;try{url=new URL(origin);}catch{throw new Error('ORIGIN_REQUIRED');}
 if(url.protocol!=='https:'||url.host!==host||scalar(headers['sec-fetch-site'])==='cross-site')throw new Error('ORIGIN_REQUIRED');
 if(!scalar(headers['content-type']).toLowerCase().startsWith('application/json'))throw new Error('INVALID_REQUEST');
}
/** Trust the Vercel-owned address header only, not a client body, cookie or arbitrary forwarded chain. */
export function freeNetwork(headers:Headers){const value=scalar(headers['x-vercel-forwarded-for']);if(!isIP(value))throw new Error('TRUSTED_NETWORK_UNAVAILABLE');return value;}
export function freeIdentity(headers:Headers,secret:string,time=Date.now()){
 if(!secret)throw new Error('FREE_SECURITY_UNAVAILABLE');
 const cookies=scalar(headers.cookie).split(';').map(s=>s.trim()),raw=cookies.find(s=>s.startsWith(FREE_COOKIE+'='))?.slice(FREE_COOKIE.length+1),parts=raw?.split('.');
 const day=freeDay(time);let nonce='';
 if(parts?.length===3&&parts[0]===day&&/^[A-Za-z0-9_-]{43}$/.test(parts[1])&&/^[a-f0-9]{64}$/.test(parts[2])){
  const signature=digest(secret,`${day}.${parts[1]}`);if(timingSafeEqual(Buffer.from(signature),Buffer.from(parts[2])))nonce=parts[1];
 }
 let cookie:string|undefined;
 if(!nonce){nonce=randomBytes(32).toString('base64url');const value=`${day}.${nonce}.${digest(secret,`${day}.${nonce}`)}`;cookie=`${FREE_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${Math.max(1,Math.ceil((freeDayEnd(time)-time)/1000))}`;}
 return {uid:'free_'+digest(secret,`${day}:${nonce}`),networkKey:digest(secret,`${day}:network:${freeNetwork(headers)}`),cookie};
}
/** Daily counters are protected server records; no raw IP, message, email or client-claimed UID. */
export async function takeFreeDaily(db:Firestore,identity:{uid:string;networkKey:string},requestId:string,time=Date.now(),classify=false){
 const collection=db.collection(`${SERVER_ROOT}/free_chat_days`),day=freeDay(time);
 const refs=[collection.doc(`device-${identity.uid}-${day}`),collection.doc(`network-${identity.networkKey}-${day}`),collection.doc(`request-${digest(identity.networkKey,identity.uid+':'+requestId)}-${day}`)];
 try{return await db.runTransaction(async tx=>{
  const snapshots=await tx.getAll(...refs);if(snapshots[2].exists)return false;
  if(snapshots.slice(0,2).some(s=>Number(s.data()?.count??0)>=FREE_DAILY_LIMIT)){if(classify)throw Object.assign(new Error('FREE_DAILY_LIMIT'),{code:'FREE_DAILY_LIMIT'});return false;}
  const createdAt=new Date(time),expiresAt=new Date(freeDayEnd(time));
  refs.forEach((ref,i)=>tx.set(ref,{count:i===2?1:Number(snapshots[i].data()?.count??0)+1,createdAt:snapshots[i].data()?.createdAt??createdAt,expiresAt}));
  return true;
 });}catch(error){
  // A contended reservation is not available capacity. Never dispatch or count it as a provider failure.
  if(error&&typeof error==='object'&&'code'in error&&(error.code===10||error.code==='ABORTED'))return false;
  throw error;
 }
}
