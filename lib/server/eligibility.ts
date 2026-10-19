import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

export class EligibilityError extends Error {
  constructor(public readonly code:'LOGIN_REQUIRED'|'PROFILE_REQUIRED',public readonly status=code==='PROFILE_REQUIRED'?403:401) { super(code); }
}
/** An authenticated token alone is insufficient to use paid APIs or community data. */
export async function requireEligibleUser(token:string,deps:{auth:Pick<Auth,'verifyIdToken'>;db:Pick<Firestore,'doc'>}) {
  // Admin SDK verifies signature, issuer/audience/expiry and checks revocation/disabled state.
  let decoded;
  try{decoded=await deps.auth.verifyIdToken(token,true);}catch{throw new EligibilityError('LOGIN_REQUIRED');}
  if(decoded.firebase?.sign_in_provider==='anonymous')throw new EligibilityError('LOGIN_REQUIRED',403);
  const profile=await deps.db.doc(`camellia_users/${decoded.uid}`).get();
  const agreedAt=profile.data()?.agreedAt;
  if(!profile.exists||typeof agreedAt!=='string'||!Number.isFinite(Date.parse(agreedAt)))throw new EligibilityError('PROFILE_REQUIRED');
  return decoded;
}
