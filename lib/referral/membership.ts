import type { Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import { referralHash } from './identity.js';
/** Read-time expiry; stopping new grants never erases an already valid trial. */
export async function referralMembership(
  db: Firestore,
  uid: string,
  now = Date.now(),
) {
  const trial = await db
      .doc(`camellia_users/${uid}/admin/referral_trial`)
      .get(),
    t = trial.data();
  if (
    !t ||
    t.source !== 'referral_trial' ||
    t.plan !== 'plus' ||
    t.status !== 'trialing' ||
    t.grantId !== referralHash(uid)
  )
    return;
  const grant = await db
      .doc(`${SERVER_ROOT}/referral_grants/${t.grantId}`)
      .get(),
    g = grant.data();
  if (
    !g ||
    g.revoked === true ||
    g.uidHash !== referralHash(uid) ||
    t.expiresAt !== g.expiresAt ||
    typeof g.createdAt !== 'string' ||
    Date.parse(g.expiresAt) - Date.parse(g.createdAt) !== 7 * 86400000 ||
    Date.parse(g.expiresAt) <= now
  )
    return;
  return {
    plan: 'plus' as const,
    trial: true,
    paid: false,
    expiresAt: g.expiresAt as string,
    trialSource: 'referral' as const,
    expandedAiReady: false,
  };
}
