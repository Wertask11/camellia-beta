import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085');
const app = initializeApp({ projectId: 'demo-camellia' }, 'completion-billing'),
  db = getFirestore(app),
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true, hmr: false },
  }),
  root = 'camellia_admin/release_phase1';
try {
  const { createBillingWebhook, billingCustomerPath, billingSubscriptionPath } =
      await server.ssrLoadModule('/lib/billing/webhook.ts'),
    { memberStatus } = await server.ssrLoadModule('/lib/membership/server.ts');
  let now = Date.parse('2026-11-11T00:00:00Z');
  const uid = 'billing-local-owner',
    auth = {
      getUser: async (id) => ({
        uid: id,
        metadata: { creationTime: '2026-11-01T00:00:00Z' },
      }),
    },
    adapter = {
      id: 'local-fixture',
      verify: async (raw, signature) => {
        if (signature !== 'LOCAL VERIFIED FIXTURE') throw new Error('invalid');
        return JSON.parse(new TextDecoder().decode(raw));
      },
    },
    handler = createBillingWebhook({
      adapter,
      dependencies: () => ({ db, auth }),
      now: () => now,
    }),
    send = (event) =>
      handler(
        new TextEncoder().encode(JSON.stringify(event)),
        'LOCAL VERIFIED FIXTURE',
      );
  const event = {
    id: 'local-paid-1',
    kind: 'paid',
    customerId: 'local-customer',
    priceId: 'local-monthly-500',
    paymentReceipt: 'local-invoice-1',
    amount: 500,
    currency: 'JPY',
    periodStart: '2026-11-11T00:00:00Z',
    periodEnd: '2026-12-11T00:00:00Z',
    occurredAt: '2026-11-11T00:00:00Z',
  };
  assert.equal((await send(event)).status, 409);
  await db.doc(billingCustomerPath(adapter.id, event.customerId)).set({
    provider: adapter.id,
    uid,
    identityCreatedAt: '2026-11-01T00:00:00Z',
  });
  assert.equal((await send(event)).status, 503);
  assert.equal((await memberStatus(db, uid, now)).plan, 'free');
  await db.doc(`${root}/config/billing`).set({
    approved: true,
    enabled: true,
    provider: adapter.id,
    monthlyPriceId: event.priceId,
    priceYen: 500,
    currency: 'JPY',
    interval: 'month',
    approvedBy: 'LOCAL OPERATOR',
    approvedAt: new Date(now).toISOString(),
  });
  for (const patch of [
    { amount: 400 },
    { currency: 'USD' },
    { uid: 'FORGED' },
    { periodEnd: 'invalid' },
  ])
    assert.equal((await send({ ...event, ...patch })).status, 400);
  const results = await Promise.all(
    Array.from({ length: 5 }, () => send(event)),
  );
  assert.ok(results.every((v) => v.status === 200));
  assert.equal(results.filter((v) => !v.body.duplicate).length, 1);
  assert.equal((await memberStatus(db, uid, now)).paid, true);
  assert.equal(
    (await db.collection(`${root}/billing_analytics_outbox`).get()).size,
    1,
  );
  assert.equal((await send({ ...event, amount: 0 })).status, 409);
  await send({ ...event, id: 'local-cancel', kind: 'cancel', amount: 0 });
  assert.equal((await memberStatus(db, uid, now)).plan, 'plus');
  assert.equal(
    (await db.doc(billingSubscriptionPath(uid)).get()).data().cancelAtPeriodEnd,
    true,
  );
  await send({
    ...event,
    id: 'local-failed',
    kind: 'payment_failed',
    amount: 0,
  });
  assert.equal((await memberStatus(db, uid, now)).plan, 'plus');
  const next = {
    ...event,
    id: 'local-paid-2',
    paymentReceipt: 'local-invoice-2',
    periodStart: '2026-12-11T00:00:00Z',
    periodEnd: '2027-01-11T00:00:00Z',
    occurredAt: '2026-12-11T00:00:00Z',
  };
  now = Date.parse(next.occurredAt);
  await send(next);
  await send({
    ...event,
    id: 'local-old-refund',
    kind: 'refund',
    refundedYen: 500,
  });
  assert.equal(
    (await memberStatus(db, uid, now)).expiresAt,
    new Date(next.periodEnd).toISOString(),
  );
  assert.equal(
    (await db.collection(`${root}/billing_analytics_outbox`).get()).size,
    2,
  );
  await send({
    ...next,
    id: 'local-partial',
    kind: 'refund',
    refundedYen: 100,
  });
  assert.equal((await memberStatus(db, uid, now)).plan, 'plus');
  await db.doc(`camellia_users/${uid}/admin/subscription`).set({
    plan: 'plus',
    source: 'verified_payment',
    status: 'active',
    paymentReceipt: next.paymentReceipt,
    amount: 500,
    currency: 'JPY',
    expiresAt: next.periodEnd,
  });
  await send({ ...next, id: 'local-full', kind: 'refund', refundedYen: 500 });
  assert.equal((await memberStatus(db, uid, now)).plan, 'free');
  await send({ ...next, id: 'local-paid-late' });
  assert.equal((await memberStatus(db, uid, now)).plan, 'free');
  const third = {
    ...next,
    id: 'local-third-refund-first',
    paymentReceipt: 'local-invoice-3',
    kind: 'refund',
    refundedYen: 500,
  };
  await send(third);
  await send({
    ...next,
    id: 'local-third-paid-late',
    paymentReceipt: 'local-invoice-3',
  });
  assert.equal((await memberStatus(db, uid, now)).plan, 'free');
  await db
    .doc(billingSubscriptionPath(uid))
    .set({
      plan: 'plus',
      source: 'operator_trial',
      status: 'trialing',
      expiresAt: '2027-02-11T00:00:00Z',
    });
  assert.equal((await memberStatus(db, uid, now)).plan, 'free');
  await db.doc(`camellia_users/${uid}/admin/subscription`).set({
    plan: 'plus',
    source: 'operator_trial',
    status: 'trialing',
    expiresAt: '2027-02-11T00:00:00Z',
  });
  assert.equal((await memberStatus(db, uid, now)).plan, 'plus');
  assert.equal((await memberStatus(db, uid, now)).trial, true);
  await db.doc(`camellia_users/${uid}/admin/subscription`).delete();
  now = Date.parse('2027-03-01T00:00:00Z');
  assert.equal((await memberStatus(db, uid, now)).plan, 'free');
  await db
    .doc(billingCustomerPath(adapter.id, 'local-future-customer'))
    .set({
      provider: adapter.id,
      uid: 'billing-local-future',
      identityCreatedAt: '2026-11-01T00:00:00Z',
    });
  await send({
    ...event,
    id: 'local-future-paid',
    customerId: 'local-future-customer',
    paymentReceipt: 'local-future-invoice',
    periodStart: '2027-04-01T00:00:00Z',
    periodEnd: '2027-05-01T00:00:00Z',
    occurredAt: '2027-03-01T00:00:00Z',
  });
  assert.equal(
    (
      await memberStatus(
        db,
        'billing-local-future',
        Date.parse('2027-03-31T23:59:59Z'),
      )
    ).plan,
    'free',
  );
  assert.equal(
    (
      await memberStatus(
        db,
        'billing-local-future',
        Date.parse('2027-04-01T00:00:00Z'),
      )
    ).plan,
    'plus',
  );
  const outbox = await db.collection(`${root}/billing_analytics_outbox`).get();
  assert.ok(
    outbox.docs.every(
      (d) =>
        d.data().event === 'plus_complete' &&
        d.data().properties.amount === 500 &&
        !JSON.stringify(d.data().properties).includes('invoice'),
    ),
  );
  console.log(
    'PASS verified adapter only, protected customer binding, 500 JPY plan, concurrent webhook idempotency, altered replay rejection, paid period cancellation, failed renewal, renewal/old-refund ordering, full refund/late paid, expiry, legacy trial rights, dedup analytics outbox. Local fixtures only; no real payment or PostHog event.',
  );
} finally {
  await server.close();
  await db.terminate();
  await deleteApp(app);
}
