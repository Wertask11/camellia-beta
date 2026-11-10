import {createHash} from 'node:crypto';
import {FieldValue,type Firestore} from 'firebase-admin/firestore';
import {SERVER_ROOT} from '../server/admin.js';
import {validSlug} from './model.js';
import {PlaceError,type PlaceOperator} from './service.js';
export const PLACE_METRICS=['detail','official','booking','map','contact'] as const;
export type PlaceMetric=typeof PLACE_METRICS[number];
const day=(now:number)=>new Date(now+9*3600000).toISOString().slice(0,10);
const allowed=(actor:PlaceOperator,slug:string)=>actor.operator||actor.managedSlugs?.includes(slug);
/** Public catalog operations only. A retry reuses eventId and cannot increment another kind. */
export async function recordPlaceMetric(db:Firestore,input:Record<string,unknown>,now=Date.now()){
 if(Object.keys(input).some(k=>!['operation','slug','eventId','kind'].includes(k))||!validSlug(input.slug)||typeof input.eventId!=='string'||!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(input.eventId)||typeof input.kind!=='string'||!PLACE_METRICS.includes(input.kind as PlaceMetric))throw new PlaceError(400,'INVALID_METRIC');
 const slug=input.slug,kind=input.kind as PlaceMetric,id=createHash('sha256').update(`${slug}:${input.eventId}`).digest('hex'),receipt=db.doc(`${SERVER_ROOT}/place_metric_receipts/${id}`),summary=db.doc(`${SERVER_ROOT}/place_metric_days/${slug}_${day(now)}`);
 return db.runTransaction(async tx=>{const [place,previous]=await Promise.all([tx.get(db.doc(`${SERVER_ROOT}/places/${slug}`)),tx.get(receipt)]);if(place.data()?.status!=='published')throw new PlaceError(404,'NOT_FOUND');if(previous.exists){if(previous.data()?.kind!==kind)throw new PlaceError(409,'INVALID_METRIC');return {recorded:false};}tx.set(receipt,{slug,kind,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+32*86400000)});tx.set(summary,{slug,date:day(now),[kind]:FieldValue.increment(1)},{merge:true});return {recorded:true};});
}
export async function placeMetricSummary(db:Firestore,actor:PlaceOperator,slug:unknown,days=30,now=Date.now()){
 if(!validSlug(slug)||!Number.isInteger(days)||days<1||days>31)throw new PlaceError(400,'INVALID_METRIC');if(!allowed(actor,slug))throw new PlaceError(403,'OPERATOR_REQUIRED');
 const docs=await db.getAll(...Array.from({length:days},(_,i)=>db.doc(`${SERVER_ROOT}/place_metric_days/${slug}_${day(now-i*86400000)}`)));const counts=Object.fromEntries(PLACE_METRICS.map(kind=>[kind,docs.reduce((n,d)=>n+Math.max(0,Number(d.data()?.[kind])||0),0)]));
 return {slug,days,counts,source:'online_operations',visitConfirmation:'not_available',note:'クリックや閲覧等の操作集計です。来店・予約成立の確認ではありません。'};
}
export async function acceptFreePilot(db:Firestore,actor:PlaceOperator,slug:unknown,agrees:unknown){
 if(!validSlug(slug)||agrees!==true)throw new PlaceError(400,'CONSENT_REQUIRED');if(!allowed(actor,slug))throw new PlaceError(403,'OPERATOR_REQUIRED');await db.doc(`${SERVER_ROOT}/place_agreements/${slug}`).set({slug,mode:'basic_free_pilot',priceYen:0,benefitsOptional:true,noAutomaticPaidConversion:true,acceptedBy:actor.uid,acceptedAt:new Date().toISOString()});return {accepted:true,priceYen:0};
}
