import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { PLUS_PRICE_YEN } from '../membership/model.js';
import { billingCustomerPath, type BillingAdapter, type BillingEvent } from './webhook.js';

/**
 * Stripe connection for Camellia Plus (500 JPY / month).
 * Everything stays OFF unless CAMELLIA_BILLING_ENABLED=true and every key is set,
 * and the webhook additionally requires the operator-approved config/billing document.
 */
export const STRIPE_PROVIDER = 'stripe';
const API = 'https://api.stripe.com/v1';
export type StripeConfig = { secretKey: string; webhookSecret: string; priceId: string; appUrl: string };
type Env = Record<string, string | undefined>;

export function stripeConfig(env: Env = process.env): StripeConfig | undefined {
  const secretKey = env.STRIPE_SECRET_KEY ?? '',
    webhookSecret = env.STRIPE_WEBHOOK_SECRET ?? '',
    priceId = env.STRIPE_PLUS_PRICE_ID ?? '',
    appUrl = env.CAMELLIA_APP_URL ?? '';
  if (env.CAMELLIA_BILLING_ENABLED !== 'true') return undefined;
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(secretKey)) return undefined;
  if (!/^whsec_[A-Za-z0-9]+$/.test(webhookSecret)) return undefined;
  if (!/^price_[A-Za-z0-9]+$/.test(priceId)) return undefined;
  try {
    const url = new URL(appUrl);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return undefined;
    return { secretKey, webhookSecret, priceId, appUrl: url.origin };
  } catch {
    return undefined;
  }
}

/** Stripe-Signature: t=timestamp,v1=hex(hmac_sha256(secret, `${t}.${payload}`)). */
export function verifyStripeSignature(raw: Uint8Array, header: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300) {
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k, v]) => k === 'v1' && /^[a-f0-9]{64}$/.test(v ?? '')).map(([, v]) => Buffer.from(v!, 'hex'));
  if (!Number.isSafeInteger(t) || !signatures.length || Math.abs(nowSeconds - t) > toleranceSeconds) return false;
  const expected = createHmac('sha256', secret).update(`${t}.`).update(raw).digest();
  return signatures.some((s) => s.length === expected.length && timingSafeEqual(s, expected));
}

type Obj = Record<string, unknown>;
const text = (v: unknown) => (typeof v === 'string' ? v : '');
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown) => (typeof v === 'string' ? v : typeof obj(v).id === 'string' ? (obj(v).id as string) : '');
const iso = (seconds: unknown) => {
  if (!Number.isSafeInteger(seconds)) throw new Error('INVALID_STRIPE_EVENT');
  return new Date((seconds as number) * 1000).toISOString();
};
/** Price and period of the first line. Supports both older (line.price) and newer (line.pricing) API shapes. */
function invoiceLine(invoice: Obj) {
  const line = obj((obj(invoice.lines).data as unknown[] | undefined)?.[0]);
  const priceId = str(line.price) || str(obj(obj(line.pricing).price_details).price);
  const period = obj(line.period);
  return { priceId, periodStart: iso(period.start), periodEnd: iso(period.end) };
}
function subscriptionPeriod(sub: Obj) {
  const item = obj((obj(sub.items).data as unknown[] | undefined)?.[0]);
  return {
    priceId: str(item.price),
    periodStart: iso(item.current_period_start ?? sub.current_period_start),
    periodEnd: iso(item.current_period_end ?? sub.current_period_end),
  };
}
export type Ignored = { ignored: true; type: string };
/**
 * Map a verified Stripe event to Camellia's normalized billing event. Unrelated
 * events are acknowledged and ignored so that Stripe does not retry them.
 */
export async function normalizeStripeEvent(event: Obj, fetchInvoice: (id: string) => Promise<Obj>): Promise<BillingEvent | Ignored> {
  const type = text(event.type),
    data = obj(obj(event.data).object),
    id = text(event.id),
    occurredAt = iso(event.created);
  const currency = (c: unknown) => {
    if (String(c).toLowerCase() !== 'jpy') throw new Error('INVALID_STRIPE_EVENT');
    return 'JPY' as const;
  };
  if (type === 'invoice.paid' || type === 'invoice.payment_failed') {
    const line = invoiceLine(data);
    return {
      id,
      kind: type === 'invoice.paid' ? 'paid' : 'payment_failed',
      customerId: str(data.customer),
      paymentReceipt: str(data),
      amount: Number(type === 'invoice.paid' ? data.amount_paid : data.amount_due),
      currency: currency(data.currency),
      occurredAt,
      ...line,
    };
  }
  if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    const previous = obj(obj(event.data).previous_attributes);
    if (type === 'customer.subscription.updated' && !(data.cancel_at_period_end === true && previous.cancel_at_period_end === false))
      return { ignored: true, type };
    const period = subscriptionPeriod(data);
    return {
      id,
      kind: type === 'customer.subscription.deleted' ? 'expired' : 'cancel',
      customerId: str(data.customer),
      paymentReceipt: str(data.latest_invoice),
      amount: PLUS_PRICE_YEN,
      currency: currency(data.currency ?? 'jpy'),
      occurredAt,
      ...period,
    };
  }
  if (type === 'charge.refunded') {
    const invoiceId = str(data.invoice);
    // Newer API versions omit charge.invoice; such refunds are handled by the operator in Stripe.
    if (!invoiceId) return { ignored: true, type };
    const invoice = await fetchInvoice(invoiceId),
      line = invoiceLine(invoice);
    return {
      id,
      kind: 'refund',
      customerId: str(data.customer),
      paymentReceipt: invoiceId,
      amount: Number(data.amount),
      currency: currency(data.currency),
      occurredAt,
      refundedYen: Math.min(Number(data.amount_refunded), PLUS_PRICE_YEN),
      ...line,
    };
  }
  return { ignored: true, type };
}

async function stripeCall(config: Pick<StripeConfig, 'secretKey'>, path: string, params?: Record<string, string>, fetcher: typeof fetch = fetch, idempotencyKey?: string) {
  const response = await fetcher(`${API}${path}`, {
    method: params ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      'Stripe-Version': '2024-06-20',
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: params ? new URLSearchParams(params).toString() : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const body = obj(await response.json().catch(() => ({})));
  if (!response.ok) throw new Error(`STRIPE_${response.status}`);
  return body;
}

export function createStripeAdapter(config: StripeConfig, fetcher: typeof fetch = fetch, now = () => Date.now()): BillingAdapter {
  return {
    id: STRIPE_PROVIDER,
    async verify(raw, signature) {
      if (!verifyStripeSignature(raw, signature, config.webhookSecret, Math.floor(now() / 1000))) throw new Error('INVALID_SIGNATURE');
      const event = obj(JSON.parse(Buffer.from(raw).toString('utf8')));
      const normalized = await normalizeStripeEvent(event, (id) => stripeCall(config, `/invoices/${encodeURIComponent(id)}`, undefined, fetcher));
      // The Stripe account may also sell other products. Acknowledge their events without touching Camellia,
      // so Stripe never sees errors and never disables the endpoint.
      if (!('ignored' in normalized) && normalized.priceId !== config.priceId) return { ignored: true, type: text(event.type) };
      return normalized;
    },
  };
}

export const billingAccountPath = (uid: string) => `camellia_users/${uid}/admin/billing_account`;
export class CheckoutError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}
/**
 * Bind (or reuse) one Stripe customer for the verified Firebase user and open a
 * Checkout session for the approved monthly price. The browser never sends a UID or price.
 */
export async function startCheckout(deps: { db: Firestore; auth: Pick<Auth, 'getUser'> }, uid: string, config: StripeConfig, fetcher: typeof fetch = fetch) {
  const account = await deps.auth.getUser(uid),
    accountRef = deps.db.doc(billingAccountPath(uid));
  let customerId = text((await accountRef.get()).data()?.customerId);
  if (!customerId) {
    const customer = await stripeCall(config, '/customers', { 'metadata[camellia]': 'plus' }, fetcher, `camellia-customer-${uid}`);
    customerId = str(customer);
    if (!/^cus_[A-Za-z0-9]+$/.test(customerId)) throw new CheckoutError(503, 'BILLING_UNAVAILABLE');
    const now = new Date().toISOString();
    await deps.db.runTransaction(async (tx) => {
      const existing = await tx.get(accountRef);
      if (existing.data()?.customerId) {
        customerId = text(existing.data()!.customerId);
        return;
      }
      tx.set(accountRef, { provider: STRIPE_PROVIDER, customerId, createdAt: now });
      tx.set(deps.db.doc(billingCustomerPath(STRIPE_PROVIDER, customerId)), {
        provider: STRIPE_PROVIDER,
        uid,
        identityCreatedAt: account.metadata.creationTime,
        createdAt: now,
      });
    });
  }
  const session = await stripeCall(config, '/checkout/sessions', {
    mode: 'subscription',
    customer: customerId,
    'line_items[0][price]': config.priceId,
    'line_items[0][quantity]': '1',
    locale: 'ja',
    success_url: `${config.appUrl}/?plus=success`,
    cancel_url: `${config.appUrl}/?plus=cancel`,
  }, fetcher);
  const url = text(session.url);
  if (!url.startsWith('https://checkout.stripe.com/')) throw new CheckoutError(503, 'BILLING_UNAVAILABLE');
  return url;
}
/** Stripe's hosted page for cancelling the subscription or changing the card. */
export async function openBillingPortal(db: Firestore, uid: string, config: StripeConfig, fetcher: typeof fetch = fetch) {
  const customerId = text((await db.doc(billingAccountPath(uid)).get()).data()?.customerId);
  if (!customerId) throw new CheckoutError(404, 'NO_SUBSCRIPTION');
  const session = await stripeCall(config, '/billing_portal/sessions', { customer: customerId, return_url: `${config.appUrl}/` }, fetcher);
  const url = text(session.url);
  if (!url.startsWith('https://billing.stripe.com/')) throw new CheckoutError(503, 'BILLING_UNAVAILABLE');
  return url;
}
