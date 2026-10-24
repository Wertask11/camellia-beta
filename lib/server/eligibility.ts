import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

export type EligibilityCode='LOGIN_REQUIRED'|'PROFILE_REQUIRED'|'INVITE_REQUIRED'|'SUSPENDED';
export class EligibilityError extends Error {
  constructor(public readonly code:EligibilityCode,public readonly status=code==='LOGIN_REQUIRED'?401:403) { super(code); }
}
export class EligibilityServiceError extends Error {
  constructor(public readonly stage:'configuration'|'token_service'|'profile_storage') { super('ELIGIBILITY_UNAVAILABLE'); }
}
const rejectedTokens=new Set(['auth/argument-error','auth/invalid-argument','auth/invalid-id-token','auth/id-token-expired','auth/id-token-revoked','auth/user-disabled','auth/user-not-found','auth/tenant-id-mismatch','auth/mismatching-tenant-id']);
/* Invites and suspension are decided by SchoolPark's backend (backend/camellia-access.js) and stored where
   people cannot write: camellia_admin/release_phase1/config/access and camellia_users/{uid}/admin/access.
   Someone whose Camellia record was created before invites were switched on keeps access. createTime is
   Firestore's own value, so it cannot be set from the app. Keep this rule identical to the backend's. */
export const ACCESS_CONFIG_PATH='camellia_admin/release_phase1/config/access';
export const userAccessPath=(uid:string)=>`camellia_users/${uid}/admin/access`;
type Snapshot={exists:boolean;data:()=>Record<string,unknown>|undefined;createTime?:{toMillis:()=>number}};
export function accessDecision(config:Snapshot,profile:Snapshot,access:Snapshot):EligibilityCode|null{
  const a=access.exists?access.data()??{}:{};
  if(a.suspended===true)return 'SUSPENDED';
  const c=config.exists?config.data()??{}:{};
  if(c.inviteRequired!==true||a.admitted===true)return null;
  const since=Number(c.requiredSince)||0,created=profile.exists?profile.createTime?.toMillis():undefined;
  return since>0&&typeof created==='number'&&created<since?null:'INVITE_REQUIRED';
}
/** An authenticated token alone is insufficient to use paid APIs or community data. */
export async function requireEligibleUser(token:string,deps:{auth:Pick<Auth,'verifyIdToken'>;db:Pick<Firestore,'doc'>}) {
  // Admin SDK verifies signature, issuer/audience/expiry and checks revocation/disabled state.
  let decoded;
  try{decoded=await deps.auth.verifyIdToken(token,true);}catch(error){
    const code=error&&typeof error==='object'&&'code'in error?error.code:undefined;
    if(typeof code==='string'&&rejectedTokens.has(code))throw new EligibilityError('LOGIN_REQUIRED');
    throw new EligibilityServiceError('token_service');
  }
  if(decoded.firebase?.sign_in_provider==='anonymous')throw new EligibilityError('LOGIN_REQUIRED',403);
  let profile,config,access;
  // In parallel, so checking invites and suspension adds no round trip before a reply.
  try{[profile,config,access]=await Promise.all([deps.db.doc(`camellia_users/${decoded.uid}`).get(),deps.db.doc(ACCESS_CONFIG_PATH).get(),deps.db.doc(userAccessPath(decoded.uid)).get()]);}catch{throw new EligibilityServiceError('profile_storage');}
  const blocked=accessDecision(config as Snapshot,profile as Snapshot,access as Snapshot);
  if(blocked)throw new EligibilityError(blocked);
  const agreedAt=profile.data()?.agreedAt;
  if(!profile.exists||typeof agreedAt!=='string'||!Number.isFinite(Date.parse(agreedAt)))throw new EligibilityError('PROFILE_REQUIRED');
  return decoded;
}
