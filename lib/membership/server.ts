import { billingSubscriptionPath } from '../billing/webhook.js';
import { billingApproved, paidRecordInMode, stripeConfig } from '../billing/stripe.js';
import { SERVER_ROOT } from '../server/admin.js';
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
  fetcher: typeof fetch = fetch,
) {
  const stripe = stripeConfig();
  const [sub, billingData, billingConfig] = await Promise.all([
    db.doc(subscriptionPath(uid)).get(),
    // With Stripe configured, a paid period from the other mode (a sandbox test) is not Plus.
    stripe ? paidRecordInMode(db, uid, stripe, fetcher) : db.doc(billingSubscriptionPath(uid)).get().then((s) => s.data()),
    stripe ? db.doc(`${SERVER_ROOT}/config/billing`).get() : undefined,
  ]);
  // Checkout opens only when Stripe keys are set AND the operator approved the same price for the webhook.
  const cfg = billingConfig?.data();
  const checkoutReady = billingApproved(cfg, stripe);
  // Owner decision: previews only until real billing is configured. Never infer readiness from a URL or client state.
  const legacy = membershipFromRecord(sub.data(), now),
    paid = membershipFromRecord(
      billingData?.source === 'verified_payment' &&
        typeof billingData.periodStart === 'string' &&
        Date.parse(billingData.periodStart) <= now
        ? billingData
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
  // Owner decision: partner sharing opens together with payments (Plus only).
  const plusNow = (referral?.plan ?? base.plan) === 'plus';
  return { ...base, ...referral, checkoutReady, sharingReady: checkoutReady && plusNow };
}
