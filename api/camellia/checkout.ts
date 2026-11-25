import { serverAdmin, adminConfigured } from '../../lib/server/admin.js';
import { requireEligibleUser, EligibilityError } from '../../lib/server/eligibility.js';
import { CheckoutError, openBillingPortal, startCheckout, stripeConfig } from '../../lib/billing/stripe.js';
type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type Res = { setHeader: (n: string, v: string) => void; status: (c: number) => { json: (v: unknown) => void } };
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
    const deps = serverAdmin(),
      user = await requireEligibleUser(header.slice(7), deps);
    if (body.operation === 'portal') return res.status(200).json({ url: await openBillingPortal(deps.db, user.uid, config) });
    if (body.operation === 'checkout') return res.status(200).json({ url: await startCheckout(deps, user.uid, config) });
    return res.status(400).json({ error: 'INVALID_OPERATION' });
  } catch (e) {
    if (e instanceof EligibilityError) return res.status(e.status).json({ error: e.code });
    if (e instanceof CheckoutError) return res.status(e.status).json({ error: e.code });
    console.warn('camellia_checkout_unavailable', { stage: 'stripe_or_storage' });
    return res.status(503).json({ error: 'BILLING_UNAVAILABLE' });
  }
}
