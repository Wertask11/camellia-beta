import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, root: process.cwd(), resolve: { alias: { '@': process.cwd() } }, server: { middlewareMode: true, hmr: false } });
try {
  const { stripeConfig, verifyStripeSignature, normalizeStripeEvent, createStripeAdapter } = await server.ssrLoadModule('/lib/billing/stripe.ts');
  const env = { CAMELLIA_BILLING_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_test_LOCAL', STRIPE_WEBHOOK_SECRET: 'whsec_LOCAL', STRIPE_PLUS_PRICE_ID: 'price_LOCAL', CAMELLIA_APP_URL: 'https://camellia.example' };
  assert.equal(stripeConfig({}), undefined, 'off by default');
  assert.equal(stripeConfig({ ...env, CAMELLIA_BILLING_ENABLED: 'false' }), undefined);
  for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PLUS_PRICE_ID', 'CAMELLIA_APP_URL']) assert.equal(stripeConfig({ ...env, [key]: 'x' }), undefined, key);
  assert.equal(stripeConfig({ ...env, CAMELLIA_APP_URL: 'http://camellia.example' }), undefined);
  assert.equal(stripeConfig(env).appUrl, 'https://camellia.example');

  const raw = new TextEncoder().encode('{"id":"evt_1"}'), t = 1_800_000_000;
  const sign = (secret, ts, body = raw) => `t=${ts},v1=${createHmac('sha256', secret).update(`${ts}.`).update(body).digest('hex')}`;
  assert.ok(verifyStripeSignature(raw, sign('whsec_LOCAL', t), 'whsec_LOCAL', t));
  assert.ok(!verifyStripeSignature(raw, sign('whsec_OTHER', t), 'whsec_LOCAL', t), 'wrong secret');
  assert.ok(!verifyStripeSignature(raw, sign('whsec_LOCAL', t), 'whsec_LOCAL', t + 301), 'replay outside tolerance');
  assert.ok(!verifyStripeSignature(new TextEncoder().encode('{"id":"evt_2"}'), sign('whsec_LOCAL', t), 'whsec_LOCAL', t), 'altered body');
  assert.ok(!verifyStripeSignature(raw, 'garbage', 'whsec_LOCAL', t));

  const invoice = (extra = {}) => ({ id: 'in_1', customer: 'cus_1', amount_paid: 500, amount_due: 500, currency: 'jpy', lines: { data: [{ price: { id: 'price_LOCAL' }, period: { start: t, end: t + 2592000 } }] }, ...extra });
  const noFetch = async () => { throw new Error('no fetch'); };
  const paid = await normalizeStripeEvent({ id: 'evt_paid', type: 'invoice.paid', created: t, data: { object: invoice() } }, noFetch);
  assert.deepEqual(paid, { id: 'evt_paid', kind: 'paid', customerId: 'cus_1', paymentReceipt: 'in_1', amount: 500, currency: 'JPY', occurredAt: new Date(t * 1000).toISOString(), livemode: false, priceId: 'price_LOCAL', periodStart: new Date(t * 1000).toISOString(), periodEnd: new Date((t + 2592000) * 1000).toISOString() });
  const newer = await normalizeStripeEvent({ id: 'evt_new', type: 'invoice.paid', created: t, data: { object: invoice({ lines: { data: [{ pricing: { price_details: { price: 'price_LOCAL' } }, period: { start: t, end: t + 10 } }] } }) } }, noFetch);
  assert.equal(newer.priceId, 'price_LOCAL', 'newer API line shape');
  assert.equal((await normalizeStripeEvent({ id: 'evt_live', type: 'invoice.paid', created: t, livemode: true, data: { object: invoice() } }, noFetch)).livemode, true, 'the Stripe mode travels with the event');
  assert.equal((await normalizeStripeEvent({ id: 'evt_f', type: 'invoice.payment_failed', created: t, data: { object: invoice({ amount_paid: 0 }) } }, noFetch)).kind, 'payment_failed');
  await assert.rejects(normalizeStripeEvent({ id: 'evt_usd', type: 'invoice.paid', created: t, data: { object: invoice({ currency: 'usd' }) } }, noFetch));
  const sub = (extra = {}) => ({ id: 'sub_1', customer: 'cus_1', latest_invoice: 'in_1', currency: 'jpy', cancel_at_period_end: true, items: { data: [{ price: { id: 'price_LOCAL' }, current_period_start: t, current_period_end: t + 100 }] }, ...extra });
  assert.equal((await normalizeStripeEvent({ id: 'evt_c', type: 'customer.subscription.updated', created: t, data: { object: sub(), previous_attributes: { cancel_at_period_end: false } } }, noFetch)).kind, 'cancel');
  assert.deepEqual(await normalizeStripeEvent({ id: 'evt_u', type: 'customer.subscription.updated', created: t, data: { object: sub(), previous_attributes: { metadata: {} } } }, noFetch), { ignored: true, type: 'customer.subscription.updated' });
  assert.equal((await normalizeStripeEvent({ id: 'evt_resume', type: 'customer.subscription.updated', created: t, data: { object: sub({ cancel_at_period_end: false }), previous_attributes: { cancel_at_period_end: true } } }, noFetch)).kind, 'resume', 'undoing a cancellation is recorded');
  assert.equal((await normalizeStripeEvent({ id: 'evt_d', type: 'customer.subscription.deleted', created: t, data: { object: sub() } }, noFetch)).kind, 'expired');
  const refund = await normalizeStripeEvent({ id: 'evt_r', type: 'charge.refunded', created: t, data: { object: { customer: 'cus_1', invoice: 'in_1', amount: 500, amount_refunded: 500, currency: 'jpy' } } }, async (id) => (assert.equal(id, 'in_1'), invoice()));
  assert.equal(refund.kind, 'refund'); assert.equal(refund.refundedYen, 500); assert.equal(refund.priceId, 'price_LOCAL');
  assert.deepEqual(await normalizeStripeEvent({ id: 'evt_r2', type: 'charge.refunded', created: t, data: { object: { customer: 'cus_1', amount: 500, amount_refunded: 500, currency: 'jpy' } } }, noFetch), { ignored: true, type: 'charge.refunded' });
  assert.deepEqual(await normalizeStripeEvent({ id: 'evt_x', type: 'customer.created', created: t, data: { object: {} } }, noFetch), { ignored: true, type: 'customer.created' });

  const adapter = createStripeAdapter(stripeConfig(env), noFetch, () => t * 1000);
  const body = new TextEncoder().encode(JSON.stringify({ id: 'evt_paid', type: 'invoice.paid', created: t, data: { object: invoice() } }));
  assert.equal((await adapter.verify(body, sign('whsec_LOCAL', t, body))).kind, 'paid');
  await assert.rejects(adapter.verify(body, sign('whsec_OTHER', t, body)));
  const otherProduct = new TextEncoder().encode(JSON.stringify({ id: 'evt_emu', type: 'invoice.paid', created: t, data: { object: invoice({ customer: 'cus_OTHER', lines: { data: [{ price: { id: 'price_OTHER_PRODUCT' }, period: { start: t, end: t + 10 } }] } }) } }));
  assert.deepEqual(await adapter.verify(otherProduct, sign('whsec_LOCAL', t, otherProduct)), { ignored: true, type: 'invoice.paid' }, 'other products on the same Stripe account are acknowledged and ignored');
  console.log('PASS Stripe: off unless fully configured, signature/tolerance/altered-body checks, invoice paid/failed (old and new API shapes), cancel/expire/refund mapping, unrelated events ignored. No real Stripe call.');
} finally {
  await server.close();
}
