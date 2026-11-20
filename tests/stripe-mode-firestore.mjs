import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085');
const app = initializeApp(
    { projectId: 'demo-camellia' },
    'stripe-mode-isolation',
  ),
  db = getFirestore(app),
  vite = await createServer({
    configFile: false,
    plugins: [
      {
        name: 'mode-disclosure-fixture',
        enforce: 'pre',
        resolveId(id) {
          if (id.endsWith('/server/admin.js')) return '\0mode-disclosure-admin';
        },
        load(id) {
          if (id === '\0mode-disclosure-admin')
            return 'export const SERVER_ROOT="camellia_admin/release_phase1";export const adminConfigured=()=>true;export const serverAdmin=()=>({db:globalThis[Symbol.for("mode-disclosure-db")]});';
        },
      },
    ],
    root: process.cwd(),
    server: { middlewareMode: true, hmr: false },
  }),
  hash = (s) => createHash('sha256').update(s).digest('hex'),
  uid = 'LOCAL MODE ISOLATION',
  now = Date.now(),
  old = new Date(now - 30 * 86400000).toISOString(),
  envBefore = process.env.VERCEL_ENV;
globalThis[Symbol.for('mode-disclosure-db')] = db;
try {
  const {
      billingRoot,
      billingEntitlementPath,
      billingConfigPath,
      billingReadMode,
    } = await vite.ssrLoadModule('/lib/billing/scope.ts'),
    { createBillingWebhook, billingCustomerPath } = await vite.ssrLoadModule(
      '/lib/billing/webhook.ts',
    ),
    { memberStatus } = await vite.ssrLoadModule('/lib/membership/server.ts'),
    { billingAnalyticsReady } = await vite.ssrLoadModule(
      '/lib/billing/analytics.ts',
    ),
    { lifecycleCleanup, reviewRetentionDisposition } = await vite.ssrLoadModule(
      '/lib/server/lifecycle-retention.ts',
    );
  await db.doc(`camellia_users/${uid}`).set({ agreedAt: old });
  const profile = await db.doc(`camellia_users/${uid}`).get();
  const cfg = {
    approved: true,
    enabled: true,
    provider: 'stripe',
    priceYen: 500,
    currency: 'JPY',
    interval: 'month',
    approvedBy: 'LOCAL',
    approvedAt: old,
    monthlyPriceId: 'price_same_fixture_id',
  };
  const retention = {
    approved: true,
    approvedBy: 'LOCAL',
    approvedAt: old,
    retentionMs: 86400000,
  };
  for (const mode of ['test', 'live']) {
    await db.doc(billingConfigPath('billing', mode)).set({ ...cfg, mode });
    await db
      .doc(billingConfigPath('retention', mode))
      .set({ collections: { billing_analytics_outbox: retention } });
    await db
      .doc(billingCustomerPath('stripe', 'cus_same_fixture_id', mode))
      .set({
        uid,
        provider: 'stripe',
        identityCreatedAt: old,
        analyticsProfileId: randomUUID(),
        analyticsProfileEpoch: profile.createTime.toMillis(),
        analyticsConsentFrom: old,
        analyticsConsentUntil: new Date(now + 86400000).toISOString(),
      });
    await db
      .doc(`${billingRoot(mode)}/billing_owners/${hash(uid)}`)
      .set({ customerId: 'cus_same_fixture_id', identityCreatedAt: old });
  }
  const event = {
    id: 'evt_same_fixture_id',
    kind: 'paid',
    customerId: 'cus_same_fixture_id',
    priceId: 'price_same_fixture_id',
    paymentReceipt: 'in_same_fixture_id',
    amount: 500,
    currency: 'JPY',
    periodStart: old,
    periodEnd: new Date(now + 86400000).toISOString(),
    occurredAt: new Date(now).toISOString(),
  };
  const send = (mode, value) =>
    createBillingWebhook({
      adapter: { id: 'stripe', mode, verify: async () => value },
      dependencies: () => ({
        db,
        auth: { getUser: async () => ({ metadata: { creationTime: old } }) },
      }),
      now: () => now,
    })(new Uint8Array([1]), 'LOCAL SIGNATURE FIXTURE');
  assert.equal((await send('test', event)).status, 200);
  assert.equal(
    (await db.doc(billingEntitlementPath(uid, 'test')).get()).data().plan,
    'plus',
  );
  assert.equal(
    (await db.doc(billingEntitlementPath(uid, 'live')).get()).exists,
    false,
  );
  assert.equal(
    (await memberStatus(db, uid, now, undefined, 'live')).plan,
    'free',
  );
  assert.equal(
    (await memberStatus(db, uid, now, undefined, 'test')).billingMode,
    'test',
  );
  assert.equal(
    (
      await db
        .collection(`${billingRoot('test')}/billing_analytics_outbox`)
        .get()
    ).empty,
    true,
    'sandbox never creates real revenue outbox',
  );
  process.env.VERCEL_ENV = 'production';
  assert.equal(billingReadMode(), 'live');
  assert.equal((await memberStatus(db, uid, now)).plan, 'free');
  process.env.VERCEL_ENV = 'preview';
  assert.equal((await memberStatus(db, uid, now)).plan, 'plus');
  assert.equal(
    await billingAnalyticsReady(db, {
      VERCEL_ENV: 'preview',
      CAMELLIA_BILLING_ANALYTICS_ENABLED: 'true',
    }),
    false,
  );
  const liveEvent = {
    ...event,
    periodEnd: new Date(now + 100 * 86400000).toISOString(),
  };
  assert.equal(
    (await send('live', liveEvent)).status,
    200,
    'same provider object IDs are distinct ledgers across modes',
  );
  assert.equal(
    (await memberStatus(db, uid, now, undefined, 'live')).paid,
    true,
  );
  const saved = (
    await db.doc(billingEntitlementPath(uid, 'live')).get()
  ).data();
  await send('test', {
    ...event,
    id: 'evt_sandbox_refund',
    kind: 'refund',
    amount: 0,
    refundedYen: 500,
  });
  assert.deepEqual(
    (await db.doc(billingEntitlementPath(uid, 'live')).get()).data(),
    saved,
    'sandbox refunds never touch live rights',
  );
  assert.equal(
    (await memberStatus(db, uid, now, undefined, 'test')).paid,
    true,
    'existing live right remains accessible in Preview',
  );
  // Setup completed retention of sandbox child receipts, then exercise actual scoped customer cleanup.
  for (const c of ['billing_events', 'billing_receipts'])
    for (const d of (await db.collection(`${billingRoot('test')}/${c}`).get())
      .docs)
      await d.ref.delete();
  await db.doc(billingConfigPath('retention', 'test')).set({
    lifecycleVersion: 'lifecycle_v1',
    collections: {
      billing_customers: {
        ...retention,
        mode: 'closed_payment',
        legalReviewApproved: true,
        legalBasis: 'LOCAL TEST ACCOUNT CLOSED',
      },
    },
  });
  const customer = billingCustomerPath('stripe', 'cus_same_fixture_id', 'test');
  await reviewRetentionDisposition(
    db,
    'billing_customers',
    customer.split('/').at(-1),
    {
      providerClosed: true,
      managementNoLongerRequired: true,
      legalReviewApproved: true,
      reviewedBy: 'LOCAL',
      reason: 'LOCAL CLOSED SANDBOX',
      closedAt: old,
    },
    true,
  );
  const plan = await lifecycleCleanup(db, 'billing_customers', {
    stripeTest: true,
    now: now + 10 * 86400000,
  });
  assert.equal(plan.eligible, 1);
  await lifecycleCleanup(db, 'billing_customers', {
    stripeTest: true,
    now: now + 10 * 86400000,
    apply: true,
    approvedDigest: plan.digest,
  });
  assert.equal((await db.doc(customer).get()).exists, false);
  assert.ok(
    (
      await db
        .doc(billingCustomerPath('stripe', 'cus_same_fixture_id', 'live'))
        .get()
    ).exists,
  );
  assert.deepEqual(
    (await db.doc(billingEntitlementPath(uid, 'live')).get()).data(),
    saved,
  );
  const disclosure = (
    await vite.ssrLoadModule('/api/camellia/billing-disclosure.ts')
  ).default;
  for (const mode of ['test', 'live']) {
    await db
      .doc(billingConfigPath('billing', mode))
      .set({
        disclosuresApproved: true,
        disclosure: {
          approved: true,
          approvedBy: 'LOCAL',
          approvedAt: old,
          version: 'local',
          seller: 'LOCAL ' + mode,
          representative: 'LOCAL',
          address: 'LOCAL',
          contact: 'LOCAL',
          paymentTiming: 'LOCAL',
          cancellation: 'LOCAL',
          refund: 'LOCAL',
        },
      });
    process.env.VERCEL_ENV = mode === 'test' ? 'preview' : 'production';
    let status, body;
    await disclosure(
      { method: 'GET' },
      {
        setHeader() {},
        status(c) {
          status = c;
          return {
            json(v) {
              body = v;
            },
          };
        },
      },
    );
    assert.equal(status, 200);
    assert.equal(body.seller, 'LOCAL ' + mode);
    assert.equal(body.mode, mode);
    assert.ok(!('monthlyPriceId' in body));
  }
  console.log(
    'PASS isolated sandbox config/customer/contract ledger namespace and entitlement, production ignores test rights, test refunds/cleanup preserve live rights, shared legacy rights remain in Preview, sandbox revenue suppressed, scoped retention dry-run/apply. Firestore/provider/Auth fixtures only; no actual Stripe purchase.',
  );
} finally {
  if (envBefore === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = envBefore;
  delete globalThis[Symbol.for('mode-disclosure-db')];
  await vite.close();
  await db.terminate();
  await deleteApp(app);
}
