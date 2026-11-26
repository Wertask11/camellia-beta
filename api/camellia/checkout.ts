import { serverAdmin, adminConfigured, SERVER_ROOT } from '../../lib/server/admin.js';
import { requireEligibleUser, EligibilityError } from '../../lib/server/eligibility.js';
import { billingApproved, CheckoutError, openBillingPortal, startCheckout, stripeConfig } from '../../lib/billing/stripe.js';
type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type Res = { setHeader: (n: string, v: string) => void; status: (c: number) => { json: (v: unknown) => void } };
/**
 * Someone who pays must always be able to cancel or change the card: the billing portal needs only a
 * verified (non-guest) login, not the profile, invite or operator approval that new checkouts need.
 * This keeps it open after a personal-record reset, a suspension, or the operator stopping new sign-ups.
 */
async function requireAccountOwner(token: string, auth: ReturnType<typeof serverAdmin>['auth']) {
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token, true);
  } catch {
    throw new EligibilityError('LOGIN_REQUIRED');
  }
  const provider = decoded.firebase?.sign_in_provider;
  if (provider === 'anonymous' || (provider === 'password' && decoded.email_verified !== true)) throw new EligibilityError('LOGIN_REQUIRED', 403);
  return decoded;
}
/** POST {operation:'checkout'|'portal'} with a Firebase ID token. Returns a Stripe-hosted URL. */
export default async function checkout(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const config = stripeConfig();
  if (!config || !adminConfigured()) return res.status(503).json({ error: 'BILLING_NOT_READY' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'LOGIN_REQUIRED' });
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
  try {
    const deps = serverAdmin();
    if (body.operation === 'portal') {
      const owner = await requireAccountOwner(header.slice(7), deps.auth);
      return res.status(200).json({ url: await openBillingPortal(deps.db, owner.uid, config) });
    }
    if (body.operation === 'checkout') {
      const user = await requireEligibleUser(header.slice(7), deps);
      // New sign-ups only while the operator approval for this exact price is in place (scripts/billing-config.mjs).
      if (!billingApproved((await deps.db.doc(`${SERVER_ROOT}/config/billing`).get()).data(), config))
        return res.status(503).json({ error: 'BILLING_NOT_READY' });
      return res.status(200).json({ url: await startCheckout(deps, user.uid, config) });
    }
    return res.status(400).json({ error: 'INVALID_OPERATION' });
  } catch (e) {
    if (e instanceof EligibilityError) return res.status(e.status).json({ error: e.code });
    if (e instanceof CheckoutError) return res.status(e.status).json({ error: e.code });
    console.warn('camellia_checkout_unavailable', { stage: 'stripe_or_storage', code: e instanceof Error ? e.message.slice(0, 40) : 'UNKNOWN' });
    return res.status(503).json({ error: 'BILLING_UNAVAILABLE' });
  }
}
