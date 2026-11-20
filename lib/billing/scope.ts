import { SERVER_ROOT } from '../server/admin.js';
/** A sandbox can share Auth with Production, but never customer bindings, contracts or paid rights. */
export const STRIPE_TEST_ROOT = `${SERVER_ROOT}/billing_sandboxes/stripe_test`;
export type BillingMode = 'live' | 'test';
export const billingRoot = (mode: BillingMode = 'live') =>
  mode === 'test' ? STRIPE_TEST_ROOT : SERVER_ROOT;
export const billingConfigPath = (name: string, mode: BillingMode = 'live') =>
  `${billingRoot(mode)}/config/${name}`;
export const billingEntitlementPath = (
  uid: string,
  mode: BillingMode = 'live',
) =>
  `camellia_users/${uid}/admin/${mode === 'test' ? 'billing_test_subscription' : 'billing_subscription'}`;
// Only Preview may consume sandbox rights. Missing deployment information keeps live/legacy behavior.
export const billingReadMode = (): BillingMode =>
  process.env.VERCEL_ENV === 'preview' ? 'test' : 'live';
