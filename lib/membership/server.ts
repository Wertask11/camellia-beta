import { billingSubscriptionPath } from '../billing/webhook.js';
import { referralMembership } from '../referral/membership.js';
import type { Firestore } from 'firebase-admin/firestore';
import { membershipFromRecord } from './model.js';
export const subscriptionPath = (uid: string) =>
  `camellia_users/${uid}/admin/subscription`;
export const shareQuotaPath = (uid: string) =>
  `camellia_users/${uid}/admin/partner_share_quota`;
export async function memberStatus(
  db: Firestore,
  uid: string,
  now = Date.now(),
) {
  const [sub, billing] = await Promise.all([
    db.doc(subscriptionPath(uid)).get(),
    db.doc(billingSubscriptionPath(uid)).get(),
  ]);
  // Owner decision: previews only until real billing is configured. Never infer readiness from a URL or client state.
  const legacy = membershipFromRecord(sub.data(), now),
    paid = membershipFromRecord(
      billing.data()?.source === 'verified_payment' &&
        typeof billing.data()?.periodStart === 'string' &&
        Date.parse(billing.data()!.periodStart) <= now
        ? billing.data()
        : undefined,
      now,
    );
  // Personal record reset and future billing events do not erase an existing operator/legacy grant.
  const base =
    paid.plan === 'plus' &&
    (legacy.plan === 'free' ||
      Date.parse(paid.expiresAt!) >= Date.parse(legacy.expiresAt!))
      ? paid
      : legacy;
  const referral =
    base.plan === 'free' ? await referralMembership(db, uid, now) : undefined;
  return { ...base, ...referral, sharingReady: false };
}
