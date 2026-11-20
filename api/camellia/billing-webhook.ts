import { adminConfigured, serverAdmin } from '../../lib/server/admin.js';
import { createBillingWebhook } from '../../lib/billing/webhook.js';
import { stripeSettings, stripeClient, stripeAdapter } from '../../lib/billing/stripe.js';
import{billingConfigPath}from'../../lib/billing/scope.js';
import { rawBillingBody } from '../../lib/billing/raw-body.js';
export const config = { api: { bodyParser: false } };
type Req = Parameters<typeof rawBillingBody>[0] & { method?: string; headers?: Record<string, string | string[] | undefined> };
type Res = { setHeader: (n: string, v: string) => void; status: (c: number) => { json: (v: unknown) => void } };
export default function billingWebhook(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  const settings = stripeSettings();
  if (!settings || !adminConfigured()) return res.status(503).json({ error: 'BILLING_NOT_READY' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  return processEvent();
  async function processEvent() {
    try {
      const signature = req.headers?.['stripe-signature'];
      if (typeof signature !== 'string') return res.status(400).json({ error: 'INVALID_SIGNATURE' });
      const deps = serverAdmin(), configuration = (await deps.db.doc(billingConfigPath('billing',settings!.mode)).get()).data();
      if (configuration?.approved !== true || configuration.enabled !== true || configuration.provider !== 'stripe' || configuration.mode !== settings!.mode || typeof configuration.monthlyPriceId !== 'string') return res.status(503).json({ error: 'BILLING_NOT_READY' });
      const handler = createBillingWebhook({ adapter: stripeAdapter(stripeClient(settings!.key), { secret: settings!.secret, mode: settings!.mode, priceId: configuration.monthlyPriceId }), dependencies: () => deps });
      const result = await handler(await rawBillingBody(req), signature);
      return res.status(result.status).json(result.body);
    } catch { return res.status(503).json({ error: 'BILLING_UNAVAILABLE' }); }
  }
}
