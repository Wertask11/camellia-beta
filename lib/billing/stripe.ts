import Stripe from 'stripe';
import type { BillingAdapter, BillingEvent } from './webhook.js';
import { BillingProviderUnavailable } from './webhook.js';

export type StripeMode = 'test' | 'live';
export function stripeSettings(env: NodeJS.ProcessEnv = process.env) {
  const mode = env.CAMELLIA_BILLING_MODE;
  if (env.CAMELLIA_STRIPE_ENABLED !== 'true' || !['test', 'live'].includes(mode ?? '')) return;
  // A Preview must never create live charges; Production cannot silently use a sandbox.
  if (env.VERCEL_ENV === 'production' && mode !== 'live' || env.VERCEL_ENV === 'preview' && mode !== 'test') return;
  const key = env.STRIPE_SECRET_KEY, secret = env.STRIPE_WEBHOOK_SECRET;
  if (!key?.startsWith(`sk_${mode}_`) || !/^whsec_[A-Za-z0-9]+$/.test(secret ?? '')) return;
  return { mode: mode as StripeMode, key, secret: secret! };
}
export function stripeClient(key: string) {
  return new Stripe(key, { apiVersion: '2026-11-18.endive', timeout: 8000, maxNetworkRetries: 1 });
}
export function stripePriceValid(price: Stripe.Price, expected: string, mode: StripeMode) {
  return price.id === expected && price.active === true && price.livemode === (mode === 'live') &&
    price.currency === 'jpy' && price.unit_amount === 500 && price.type === 'recurring' &&
    price.recurring?.interval === 'month' && price.recurring.interval_count === 1 &&
    price.recurring.usage_type === 'licensed' && price.billing_scheme === 'per_unit' &&
    price.transform_quantity === null && (price.tax_behavior === 'inclusive' || price.tax_behavior === 'unspecified');
}
const idOf = (value: string | { id: string } | null | undefined) => typeof value === 'string' ? value : value?.id;
const iso = (seconds: number) => {
  if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new Error('INVALID_STRIPE_PERIOD');
  return new Date(seconds * 1000).toISOString();
};
/** Only signed events are inspected. Their IDs select canonical Stripe resources, never client assertions. */
export function stripeAdapter(stripe: Stripe, options: { secret: string; mode: StripeMode; priceId: string }): BillingAdapter {
  return { id: 'stripe', async verify(raw, signature) {
    const event = stripe.webhooks.constructEvent(Buffer.from(raw), signature, options.secret);
    if (event.livemode !== (options.mode === 'live')) throw new Error('STRIPE_MODE_MISMATCH');
    const supported = ['invoice.paid', 'invoice.payment_failed', 'customer.subscription.updated', 'customer.subscription.deleted', 'charge.refunded'];
    if (!supported.includes(event.type)) return null; // A signed checkout completion alone never grants Plus.
    try {
      let invoiceId: string | undefined;
      let kind: BillingEvent['kind'];
      let refundedYen: number | undefined;
      const object = event.data.object;
      if (!('id' in object) || typeof object.id !== 'string') throw new Error('STRIPE_OBJECT_MISSING');
      if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
        invoiceId = object.id;
        kind = event.type === 'invoice.paid' ? 'paid' : 'payment_failed';
      } else if (event.type === 'charge.refunded') {
        const charge = await stripe.charges.retrieve(object.id);
        if (charge.livemode !== (options.mode === 'live') || charge.currency !== 'jpy' || !charge.paid || charge.amount !== 500) throw new Error('STRIPE_CHARGE_MISMATCH');
        const paymentIntent = idOf(charge.payment_intent);
        if (!paymentIntent) throw new Error('STRIPE_PAYMENT_MISSING');
        const payments = await stripe.invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: paymentIntent }, limit: 2 });
        if (payments.has_more || payments.data.length !== 1) throw new Error('STRIPE_INVOICE_AMBIGUOUS');
        invoiceId = idOf(payments.data[0].invoice);
        const snapshot = event.data.object as Stripe.Charge;
        if (idOf(snapshot.customer) !== idOf(charge.customer) || snapshot.amount_refunded > charge.amount_refunded) throw new Error('STRIPE_REFUND_MISMATCH');
        refundedYen = snapshot.amount_refunded;
        kind = 'refund';
      } else {
        const subscription = await stripe.subscriptions.retrieve(object.id);
        if (subscription.livemode !== (options.mode === 'live') || subscription.items.has_more || subscription.items.data.length !== 1 || subscription.items.data[0].price.id !== options.priceId || subscription.items.data[0].quantity !== 1) throw new Error('STRIPE_SUBSCRIPTION_MISMATCH');
        invoiceId = idOf(subscription.latest_invoice);
        // Un-cancel and unrelated updates cannot revoke rights. Expiry is always checked at read time too.
        if (subscription.status === 'canceled') kind = 'expired';
        else if (subscription.cancel_at_period_end) kind = 'cancel';
        else return null;
      }
      if (!invoiceId) throw new Error('STRIPE_INVOICE_MISSING');
      const invoice = await stripe.invoices.retrieve(invoiceId);
      if (invoice.livemode !== (options.mode === 'live') || invoice.currency !== 'jpy' || invoice.lines.has_more || invoice.lines.data.length !== 1) throw new Error('STRIPE_INVOICE_MISMATCH');
      const line = invoice.lines.data[0], customerId = idOf(invoice.customer);
      if (!customerId || !idOf(invoice.parent?.subscription_details?.subscription) || line.parent?.type !== 'subscription_item_details' || line.parent.subscription_item_details?.proration !== false || line.pricing?.price_details?.price !== options.priceId || line.quantity !== 1 || line.amount !== 500 || invoice.total !== 500 || invoice.collection_method !== 'charge_automatically' || !['subscription_create', 'subscription_cycle'].includes(String(invoice.billing_reason))) throw new Error('STRIPE_PRICE_MISMATCH');
      if (kind === 'paid' && (invoice.status !== 'paid' || invoice.amount_paid !== 500 || invoice.amount_remaining !== 0)) throw new Error('STRIPE_NOT_PAID');
      if (kind === 'paid') {
        const payments = await stripe.invoicePayments.list({ invoice: invoice.id, status: 'paid', limit: 2 });
        if (payments.has_more || payments.data.length !== 1 || payments.data[0].amount_paid !== 500 || payments.data[0].payment.type !== 'payment_intent') throw new Error('STRIPE_PAYMENT_MISSING');
        const paymentId = idOf(payments.data[0].payment.payment_intent);
        if (!paymentId) throw new Error('STRIPE_PAYMENT_MISSING');
        const payment = await stripe.paymentIntents.retrieve(paymentId);
        if (payment.status !== 'succeeded' || payment.currency !== 'jpy' || payment.amount_received !== 500 || idOf(payment.customer) !== customerId || payment.livemode !== (options.mode === 'live')) throw new Error('STRIPE_PAYMENT_MISMATCH');
      }
      const price = await stripe.prices.retrieve(options.priceId);
      if (!stripePriceValid(price, options.priceId, options.mode)) throw new Error('STRIPE_PRICE_MISMATCH');
      return { id: event.id, kind, customerId, priceId: options.priceId, paymentReceipt: invoice.id,
        amount: kind === 'paid' ? invoice.amount_paid : 0, currency: 'JPY',
        periodStart: iso(line.period.start), periodEnd: iso(line.period.end), occurredAt: iso(event.created),
        ...(refundedYen === undefined ? {} : { refundedYen }) } satisfies BillingEvent;
    } catch {
      // Canonical lookup failures must be retried by Stripe, never acknowledged as a verified payment.
      throw new BillingProviderUnavailable();
    }
  } };
}
