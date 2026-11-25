import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085', 'Local demo emulator only');
Object.assign(process.env, { CAMELLIA_BILLING_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_test_LOCAL', STRIPE_WEBHOOK_SECRET: 'whsec_LOCAL', STRIPE_PLUS_PRICE_ID: 'price_LOCAL', CAMELLIA_APP_URL: 'https://camellia.example' });
const app = initializeApp({ projectId: 'demo-camellia' }, 'stripe-billing'), db = getFirestore(app);
const server = await createServer({ configFile: false, root: process.cwd(), resolve: { alias: { '@': process.cwd() } }, server: { middlewareMode: true, hmr: false } });
try {
  const { stripeConfig, startCheckout, openBillingPortal, createStripeAdapter, billingAccountPath } = await server.ssrLoadModule('/lib/billing/stripe.ts');
  const { createBillingWebhook } = await server.ssrLoadModule('/lib/billing/webhook.ts');
  const { memberStatus } = await server.ssrLoadModule('/lib/membership/server.ts');
  const config = stripeConfig(), uid = 'stripe-local-owner', auth = { getUser: async (id) => ({ uid: id, metadata: { creationTime: '2026-11-01T00:00:00Z' } }) };
  const calls = [];
  const fakeStripe = async (url, init) => {
    calls.push({ url, body: init.body ?? '' });
    const json = url.endsWith('/customers') ? { id: 'cus_LOCAL1' } : url.endsWith('/checkout/sessions') ? { url: 'https://checkout.stripe.com/c/pay/LOCAL' } : url.endsWith('/billing_portal/sessions') ? { url: 'https://billing.stripe.com/p/session/LOCAL' } : {};
    return { ok: true, status: 200, json: async () => json };
  };
  assert.equal((await memberStatus(db, uid)).checkoutReady, false, 'keys alone do not open checkout without operator approval');
  await db.doc('camellia_admin/release_phase1/config/billing').set({ approved: true, enabled: true, provider: 'stripe', priceYen: 500, currency: 'JPY', interval: 'month', monthlyPriceId: 'price_LOCAL', approvedBy: 'LOCAL OPERATOR', approvedAt: '2026-11-25T00:00:00Z' });
  assert.equal((await memberStatus(db, uid)).checkoutReady, true);
  await assert.rejects(openBillingPortal(db, uid, config, fakeStripe), { code: 'NO_SUBSCRIPTION' });

  assert.equal(await startCheckout({ db, auth }, uid, config, fakeStripe), 'https://checkout.stripe.com/c/pay/LOCAL');
  const session = new URLSearchParams(calls.find((c) => c.url.endsWith('/checkout/sessions')).body);
  assert.equal(session.get('customer'), 'cus_LOCAL1'); assert.equal(session.get('line_items[0][price]'), 'price_LOCAL'); assert.equal(session.get('mode'), 'subscription');
  await startCheckout({ db, auth }, uid, config, fakeStripe);
  assert.equal(calls.filter((c) => c.url.endsWith('/customers')).length, 1, 'customer is reused');
  assert.equal((await db.doc(billingAccountPath(uid)).get()).data().customerId, 'cus_LOCAL1');

  const now = Date.parse('2026-11-25T00:00:00Z'), t = Math.floor(now / 1000);
  const handler = createBillingWebhook({ adapter: createStripeAdapter(config, fakeStripe, () => now), dependencies: () => ({ db, auth }), now: () => now });
  const send = (event) => { const raw = new TextEncoder().encode(JSON.stringify(event)); return handler(raw, `t=${t},v1=${createHmac('sha256', 'whsec_LOCAL').update(`${t}.`).update(raw).digest('hex')}`); };
  const invoice = { id: 'in_LOCAL1', customer: 'cus_LOCAL1', amount_paid: 500, currency: 'jpy', lines: { data: [{ price: { id: 'price_LOCAL' }, period: { start: t, end: t + 30 * 86400 } }] } };
  assert.deepEqual((await send({ id: 'evt_ignored', type: 'customer.created', created: t, data: { object: {} } })).body, { accepted: true, ignored: true });
  assert.deepEqual((await send({ id: 'evt_other_price', type: 'invoice.paid', created: t, data: { object: { ...invoice, lines: { data: [{ price: { id: 'price_OTHER' }, period: { start: t, end: t + 100 } }] } } } })).body, { accepted: true, ignored: true }, 'other prices are ignored, never grant Plus');
  assert.equal((await memberStatus(db, uid, now + 1000)).plan, 'free');
  assert.equal((await send({ id: 'evt_paid', type: 'invoice.paid', created: t, data: { object: invoice } })).status, 200);
  let status = await memberStatus(db, uid, now + 1000);
  assert.equal(status.plan, 'plus'); assert.equal(status.paid, true);
  assert.equal((await send({ id: 'evt_paid', type: 'invoice.paid', created: t, data: { object: invoice } })).body.duplicate, true);
  assert.equal(await openBillingPortal(db, uid, config, fakeStripe), 'https://billing.stripe.com/p/session/LOCAL');
  assert.equal((await send({ id: 'evt_cancel', type: 'customer.subscription.updated', created: t, data: { object: { customer: 'cus_LOCAL1', latest_invoice: 'in_LOCAL1', currency: 'jpy', cancel_at_period_end: true, items: { data: [{ price: { id: 'price_LOCAL' }, current_period_start: t, current_period_end: t + 30 * 86400 }] } }, previous_attributes: { cancel_at_period_end: false } } })).status, 200);
  status = await memberStatus(db, uid, now + 1000);
  assert.equal(status.plan, 'plus', 'cancelling keeps the paid period');
  assert.equal((await memberStatus(db, uid, now + 31 * 86400000)).plan, 'free', 'Plus ends with the paid period');
  const forged = new TextEncoder().encode(JSON.stringify({ id: 'evt_forged', type: 'invoice.paid', created: t, data: { object: { ...invoice, id: 'in_FORGED' } } }));
  assert.equal((await handler(forged, `t=${t},v1=${'0'.repeat(64)}`)).status, 400, 'unsigned event rejected');
  console.log('PASS Stripe on emulator: checkout waits for operator approval, one customer bound to the verified user, approved price only, signed invoice.paid grants Plus once, cancel keeps paid period, forged events rejected. Fake Stripe API only; no real payment.');
} finally {
  // Leave the shared emulator as found: later billing suites count these collections.
  const root = 'camellia_admin/release_phase1';
  for (const name of ['billing_analytics_outbox', 'billing_events', 'billing_receipts', 'billing_customers']) await db.recursiveDelete(db.collection(`${root}/${name}`));
  await db.doc(`${root}/config/billing`).delete(); await db.recursiveDelete(db.doc('camellia_users/stripe-local-owner'));
  await server.close(); await db.terminate(); await deleteApp(app);
}
