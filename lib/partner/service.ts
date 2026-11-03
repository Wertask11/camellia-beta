import {createHash,randomBytes} from 'node:crypto';
import type {Firestore} from 'firebase-admin/firestore';
import {SERVER_ROOT} from '../server/admin.js';
import {membershipFromRecord} from '../membership/model.js';
import {shareQuotaPath,subscriptionPath} from '../membership/server.js';
import {ACTIONS} from '../../data/actions.js';
import {PLACE_DEMO_DATA} from '../../data/place-demo.js';
import {PlaceService} from '../place/service.js';
import {FEELING_MESSAGES,validateShare,type PublicShare} from './model.js';
export class ShareError extends Error{constructor(readonly status:number,readonly code:string){super(code);}}
export const shareHash=(token:string)=>createHash('sha256').update(token).digest('hex');
const validHash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export class PartnerShareService{
 constructor(private db:Firestore,private now=Date.now){}
 private global(){return this.db.collection(`${SERVER_ROOT}/partner_shares`);}
 private own(uid:string){return this.db.collection(`camellia_users/${uid}/partner_shares`);}
 async create(uid:string,value:unknown){
  let input;try{input=validateShare(value);}catch{throw new ShareError(400,'INVALID_SHARE');}
  const at=this.now(),createdAt=new Date(at).toISOString(),expiresAt=new Date(at+input.days*86400000).toISOString();
  let content:PublicShare={kind:input.kind,title:'',description:'',timing:input.timing,expiresAt,demo:false};
  if(input.kind==='feeling')content.title=FEELING_MESSAGES[input.feelingId!];
  if(input.kind==='action'){const a=ACTIONS.find(a=>a.id===input.actionId)!;content.title=a.title;content.description=a.description;}
  if(input.kind==='place'){
   const demo=PLACE_DEMO_DATA.find(p=>p.slug===input.placeSlug);
   const place=demo??await new PlaceService(this.db).detail(input.placeSlug!);
   content={...content,title:place.name,description:place.shortDescription,demo:Boolean(demo),placeSlug:place.slug};
  }
  const token=randomBytes(32).toString('base64url'),id=shareHash(token),ref=this.global().doc(id),own=this.own(uid).doc(id),quotaRef=this.db.doc(shareQuotaPath(uid));
  await this.db.runTransaction(async tx=>{
   const [sub,quota,owner]=await Promise.all([tx.get(this.db.doc(subscriptionPath(uid))),tx.get(quotaRef),tx.get(this.db.doc(`camellia_users/${uid}`))]);
   if(!owner.exists)throw new ShareError(403,'PROFILE_REQUIRED');
   const plan=membershipFromRecord(sub.data(),at);
   if(plan.plan!=='plus')throw new ShareError(403,'PLUS_REQUIRED');
   const q=quota.data()??{},day=Math.floor(at/86400000),count=q.day===day?Number(q.count??0):0;
   if(count>=10)throw new ShareError(429,'SHARE_LIMIT');
   tx.set(quotaRef,{day,count:count+1},{merge:true});
   tx.create(ref,{ownerUid:uid,ownerCreatedAt:owner.createTime?.toMillis(),content,createdAt,expiresAt,revoked:false});
   tx.set(own,{kind:input.kind,title:content.title,createdAt,expiresAt,revoked:false});
  });
  return {token,id,content};
 }
 async read(token:unknown){
  if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw new ShareError(404,'SHARE_NOT_FOUND');
  const record=await this.global().doc(shareHash(token)).get(),v=record.data();
  if(!record.exists||v?.revoked===true||typeof v?.expiresAt!=='string'||!Number.isFinite(Date.parse(v.expiresAt)))throw new ShareError(404,'SHARE_NOT_FOUND');
  if(Date.parse(v.expiresAt)<=this.now()){await record.ref.update({revoked:true,content:{}});throw new ShareError(404,'SHARE_NOT_FOUND');}
  const owner=await this.db.doc(`camellia_users/${v.ownerUid}`).get();
  if(!owner.exists||owner.createTime?.toMillis()!==v.ownerCreatedAt)throw new ShareError(404,'SHARE_NOT_FOUND');
  const c=v.content as PublicShare;
  return {kind:c.kind,title:c.title,description:c.description,timing:c.timing,expiresAt:c.expiresAt,demo:c.demo,...(c.placeSlug?{placeSlug:c.placeSlug}:{})};
 }
 async list(uid:string){const docs=await this.own(uid).orderBy('createdAt','desc').limit(30).get();return docs.docs.map(d=>({id:d.id,...d.data()}));}
 async revoke(uid:string,id:unknown){
  if(!validHash(id))throw new ShareError(404,'SHARE_NOT_FOUND');
  await this.db.runTransaction(async tx=>{const ref=this.global().doc(id),record=await tx.get(ref);if(!record.exists||record.data()?.ownerUid!==uid)throw new ShareError(404,'SHARE_NOT_FOUND');tx.update(ref,{revoked:true,content:{}});tx.set(this.own(uid).doc(id),{revoked:true},{merge:true});});
 }
 async revokeAll(uid:string){
  // No new public links are issued while personal deletion is in progress; eligibility is checked by the API.
  const records=await this.global().where('ownerUid','==',uid).get();
  for(const r of records.docs)await this.revoke(uid,r.id).catch(e=>{if(!(e instanceof ShareError&&e.status===404))throw e;});
 }
}
