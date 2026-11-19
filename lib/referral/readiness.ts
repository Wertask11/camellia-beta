import type {Firestore} from 'firebase-admin/firestore';
import {SERVER_ROOT} from '../server/admin.js';
import {referralConfiguration,referralDeploymentReady} from './config.js';
import {approvedCatalog} from './decorations.js';
import {estimateAttempt} from '../server/ai-observation.js';
export {referralDeploymentReady} from './config.js';
/** Numeric policy values have no fallback. Missing campaign, pricing, catalog or retention stops intake only. */
export async function referralIntakeReady(db:Firestore,env:Record<string,string|undefined>=process.env,now=Date.now()){
 if(!referralDeploymentReady(env))return false;
 const paths=['referral','ai_observation','tree_decoration_catalog','retention'];
 const [campaign,ai,catalog,retention]=(await Promise.all(paths.map(p=>db.doc(`${SERVER_ROOT}/config/${p}`).get()))).map(d=>d.data());
 const cfg=referralConfiguration(campaign).config;
 if(!cfg||cfg.newcomerAfterCap!=='grant'||!cfg.accepting||now<Date.parse(cfg.startsAt)||now>=Date.parse(cfg.endsAt)||ai?.approved!==true||ai.trialGenerationApproved!==true||!Number.isSafeInteger(ai.maxTrialInputTokens)||ai.maxTrialInputTokens<=0)return false;
 const items=approvedCatalog(catalog);if(cfg.decorationIds.some(id=>!items.some(item=>item.id===id)))return false;
 const models=[env.GEMINI_MODEL||'gemini-3.8-flash',env.GEMINI_FALLBACK_MODEL??'gemini-3.1-flash-lite'].filter(Boolean);
 if(models.some(model=>!Number.isFinite(Date.parse(ai.pricing?.[model]?.validUntil))||Date.parse(ai.pricing[model].validUntil)<=now||estimateAttempt({input:0,output:0,thinking:0,cached:0,total:0},ai.pricing?.[model]).status!=='estimate'))return false;
 for(const name of ['referral_intents','referral_grants','referral_identities','ai_usage_receipts']){
  const policy=retention?.collections?.[name];
  if(policy?.approved!==true||!Number.isSafeInteger(policy.retentionMs)||policy.retentionMs<=0||typeof policy.approvedBy!=='string'||!policy.approvedBy||!Number.isFinite(Date.parse(policy.approvedAt)))return false;
 }
 return true;
}
