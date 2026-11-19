import { serverAdmin, adminConfigured } from '../../lib/server/admin.js';
import { requireEligibleUser, EligibilityError } from '../../lib/server/eligibility.js';
import { createSharedRateLimiter } from '../../lib/server/shared-limit.js';
import { StripeCheckoutService, CheckoutError } from '../../lib/billing/checkout.js';
import { stripeSettings, stripeClient } from '../../lib/billing/stripe.js';
type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type Res = { setHeader: (n: string, v: string) => void; status: (c: number) => { json: (v: unknown) => void } };
export default async function billing(req: Req, res: Res) {
 res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer');
 const settings = stripeSettings();
 if (!settings || !adminConfigured()) return res.status(503).json({error:'BILLING_NOT_READY'});
 if (req.method !== 'POST') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 try {
  const body = req.body as Record<string,unknown> | undefined;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body))>2000 || Object.keys(body).some(k=>!['operation','input'].includes(k)) || !['status','checkout','portal','history'].includes(String(body.operation))) return res.status(400).json({error:'INVALID_CHECKOUT'});
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return res.status(401).json({error:'LOGIN_REQUIRED'});
  const deps = serverAdmin();
  let user;
  if (body.operation === 'checkout') user = await requireEligibleUser(header.slice(7),deps);
  else { try { user = await deps.auth.verifyIdToken(header.slice(7),true); } catch { return res.status(401).json({error:'LOGIN_REQUIRED'}); }
    if (user.firebase?.sign_in_provider === 'anonymous' || user.firebase?.sign_in_provider === 'password' && user.email_verified !== true) return res.status(401).json({error:'LOGIN_REQUIRED'}); }
  // Billing management remains reachable after suspension or personal-record deletion.
  const account = await deps.auth.getUser(user.uid), created = account.metadata.creationTime;
  const limit = createSharedRateLimiter(deps.db,{CAMELLIA_CHAT_RATE_USER:'20',CAMELLIA_CHAT_RATE_GLOBAL:'1000',CAMELLIA_CHAT_RATE_WINDOW_SECONDS:'300'}, Date.now, 'billing_rate_windows');
  if (!await limit.take(`billing:${user.uid}`)) return res.status(429).json({error:'SLOW_DOWN'});
  const service = new StripeCheckoutService(deps.db,stripeClient(settings.key),settings.mode), cfg = await service.configuration();
  if (body.operation === 'status') return res.status(200).json(await service.status(user.uid,created));
  if (!cfg) return res.status(503).json({error:'BILLING_NOT_READY'});
  if (req.headers.origin !== cfg.origin) return res.status(403).json({error:'ORIGIN_NOT_ALLOWED'});
  if (body.operation === 'checkout') return res.status(200).json(await service.start(user.uid,created,body.input));
  if (body.operation === 'portal') return res.status(200).json(await service.portal(user.uid,created));
  return res.status(200).json(await service.history(user.uid,created));
 } catch (e) {
  if (e instanceof CheckoutError || e instanceof EligibilityError) return res.status(e.status).json({error:e.code});
  console.warn('camellia_billing_unavailable',{stage:'checkout_or_storage'});
  return res.status(503).json({error:'BILLING_UNAVAILABLE'});
 }
}
