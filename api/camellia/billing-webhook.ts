import { serverAdmin, adminConfigured } from '../../lib/server/admin.js';
import { createBillingWebhook } from '../../lib/billing/webhook.js';
import { createStripeAdapter, stripeConfig } from '../../lib/billing/stripe.js';
/**
 * Stripe webhook. Stays 503 until Stripe keys are configured AND the operator-approved
 * config/billing document exists. Only signature-verified events can grant Plus.
 */
type Req = AsyncIterable<Uint8Array> & { method?: string; headers: Record<string, string | string[] | undefined> };
type Res = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (v: unknown) => void };
};
/** Vercel parses req.body lazily, so the untouched stream is the exact signed payload. */
async function readRaw(req: Req) {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.byteLength;
    if (size > 64000) break;
    chunks.push(chunk);
  }
  return new Uint8Array(Buffer.concat(chunks));
}
export default async function billingWebhook(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const config = stripeConfig();
  if (!config || !adminConfigured()) return res.status(503).json({ error: 'BILLING_NOT_READY' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const signature = req.headers['stripe-signature'];
  const handler = createBillingWebhook({ adapter: createStripeAdapter(config), dependencies: serverAdmin });
  const result = await handler(await readRaw(req), typeof signature === 'string' ? signature : '');
  return res.status(result.status).json(result.body);
}
