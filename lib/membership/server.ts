import type {Firestore} from 'firebase-admin/firestore';
import {membershipFromRecord} from './model.js';
export const subscriptionPath=(uid:string)=>`camellia_users/${uid}/admin/subscription`;
export const shareQuotaPath=(uid:string)=>`camellia_users/${uid}/admin/partner_share_quota`;
export async function memberStatus(db:Firestore,uid:string,now=Date.now()){
 const sub=await db.doc(subscriptionPath(uid)).get();
 // Owner decision: previews only until real billing is configured. Never infer readiness from a URL or client state.
 return {...membershipFromRecord(sub.data(),now),sharingReady:false};
}
