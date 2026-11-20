import {
  billingEntitlementPath,
  billingReadMode,
  type BillingMode,
} from '../billing/scope.js';
import { billingSubscriptionPath } from '../billing/webhook.js';
import { referralMembership } from '../referral/membership.js';
import type { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';
import { membershipFromRecord } from './model.js';
import {
  storedConversationPolicy,
  publicConversationPolicy,
} from './conversation-policy.js';
export const subscriptionPath = (uid: string) =>
  `camellia_users/${uid}/admin/subscription`;
export const shareQuotaPath = (uid: string) =>
  `camellia_users/${uid}/admin/partner_share_quota`;
export async function memberStatus(
  db: Firestore,
  uid: string,
  now = Date.now(),
  read: (path: string) => Promise<DocumentSnapshot> = (path) =>
    db.doc(path).get(),
  mode: BillingMode = billingReadMode(),
) {
  const [sub, liveBilling, sandbox] = await Promise.all([
    read(subscriptionPath(uid)),
    read(billingSubscriptionPath(uid)),
    mode === 'test'
      ? read(billingEntitlementPath(uid, 'test'))
      : Promise.resolve(undefined),
  ]);
  const sandboxRight = membershipFromRecord(
    typeof sandbox?.data()?.periodStart === 'string' &&
      Date.parse(sandbox.data()!.periodStart) <= now
      ? sandbox.data()
      : undefined,
    now,
  );
  const liveRight = membershipFromRecord(liveBilling.data(), now);
  const billing =
    sandbox &&
    sandboxRight.paid &&
    (!liveRight.paid ||
      Date.parse(sandboxRight.expiresAt!) >= Date.parse(liveRight.expiresAt!))
      ? sandbox
      : liveBilling;
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
    base.plan === 'free'
      ? await referralMembership(db, uid, now, read)
      : undefined;
  const required =
    base === paid &&
    paid.plan === 'plus' &&
    billing.data()?.conversationPolicyRequired === true;
  const policy = required
    ? storedConversationPolicy(billing.data()?.conversationPolicy, now)
    : undefined;
  return {
    ...base,
    ...referral,
    sharingReady: false,
    ...(base === paid && paid.paid && billing === sandbox
      ? { billingMode: 'test' as const }
      : {}),
    ...(required
      ? {
          conversationPolicyRequired: true,
          conversationPolicy: policy
            ? publicConversationPolicy(policy)
            : undefined,
        }
      : {}),
  };
}
