import {createHash} from 'node:crypto';
import type {Firestore} from 'firebase-admin/firestore';
import {SERVER_ROOT} from '../server/admin.js';
import {FREE_DAILY_LIMIT,freeDay,freeDayEnd} from '../free/access.js';
import {memberStatus} from './server.js';
/** The same approved Free daily ceiling applies after ID acquisition; style/thread switches cannot reset it. */
export async function takeMemberFreeDaily(db:Firestore,uid:string,now=Date.now(),classify=false,lane:'basic'|'referral_extension'='basic'){
 const owner=createHash('sha256').update(uid).digest('hex'),day=freeDay(now);
 try{return await db.runTransaction(async tx=>{
  const [root,plan]=await Promise.all([tx.get(db.doc(`camellia_users/${uid}`)),memberStatus(db,uid,now,path=>tx.get(db.doc(path)))]);
  if(!root.exists||root.data()?.personalDeleteInProgress===true)return false;
  // Plus's new quota/context is undecided. Preserve existing verified rights and the shared burst limit.
  const referral='trialSource'in plan&&plan.trialSource==='referral';
  if(lane==='basic'&&plan.plan==='plus'&&!referral)return true;
  const ref=db.doc(`${SERVER_ROOT}/member_free_chat_days/${owner}-${day}`),snapshot=await tx.get(ref),count=snapshot.data()?.count??0;
  if(!Number.isSafeInteger(count)||count<0)return false;
  if(lane==='referral_extension'){if(referral&&count>=FREE_DAILY_LIMIT)return true;if(classify)throw Object.assign(new Error('TRIAL_AI_NOT_READY'),{code:'TRIAL_AI_NOT_READY'});return false;}
  if(count>=FREE_DAILY_LIMIT){if(classify)throw Object.assign(new Error('FREE_DAILY_LIMIT'),{code:'FREE_DAILY_LIMIT'});return false;}
  tx.set(ref,{owner,day,count:count+1,createdAt:snapshot.data()?.createdAt??new Date(now),expiresAt:new Date(freeDayEnd(now))});
  return true;
 });}catch(error){if(error&&typeof error==='object'&&'code'in error&&(error.code===10||error.code==='ABORTED'))return false;throw error;}
}
