import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

export class EligibilityError extends Error {
  constructor(public readonly code:'LOGIN_REQUIRED'|'PROFILE_REQUIRED',public readonly status=code==='PROFILE_REQUIRED'?403:401) { super(code); }
}
export class EligibilityServiceError extends Error {
  constructor(public readonly stage:'configuration'|'token_service'|'profile_storage') { super('ELIGIBILITY_UNAVAILABLE'); }
}
const rejectedTokens=new Set(['auth/argument-error','auth/invalid-argument','auth/invalid-id-token','auth/id-token-expired','auth/id-token-revoked','auth/user-disabled','auth/user-not-found','auth/tenant-id-mismatch','auth/mismatching-tenant-id']);
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
  let profile;
  try{profile=await deps.db.doc(`camellia_users/${decoded.uid}`).get();}catch{throw new EligibilityServiceError('profile_storage');}
  const agreedAt=profile.data()?.agreedAt;
  if(!profile.exists||typeof agreedAt!=='string'||!Number.isFinite(Date.parse(agreedAt)))throw new EligibilityError('PROFILE_REQUIRED');
  return decoded;
}
