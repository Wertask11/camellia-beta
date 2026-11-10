import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  initializeTestEnvironment,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';
assert.equal(
  process.env.FIRESTORE_EMULATOR_HOST,
  '127.0.0.1:8085',
  'Local demo emulator only',
);
const env = await initializeTestEnvironment({
    projectId: 'demo-camellia',
    firestore: {
      host: '127.0.0.1',
      port: 8085,
      rules: await readFile(
        new URL('./fixtures/schoolpark.firestore.rules', import.meta.url),
        'utf8',
      ),
    },
  }),
  app = initializeApp({ projectId: 'demo-camellia' }, 'referral-quality'),
  db = getFirestore(app),
  root = 'camellia_admin/release_phase1',
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    resolve: { alias: { '@': process.cwd() } },
    server: { middlewareMode: true, hmr: false },
  });
try {
  const { ReferralService } = await server.ssrLoadModule(
      '/lib/referral/service.ts',
    ),
    { referralHash } = await server.ssrLoadModule('/lib/referral/identity.ts'),
    { memberStatus } = await server.ssrLoadModule('/lib/membership/server.ts');
  let now = Date.now();
  const start = now - 60000,
    accounts = new Map(),
    auth = {
      async getUser(uid) {
        const account = accounts.get(uid);
        if (!account) throw new Error('LOCAL USER MISSING');
        return account;
      },
    },
    service = new ReferralService(db, auth, () => now),
    cfgRef = db.doc(`${root}/config/referral`);
  const account = async (uid, google = uid, created = now - 1000) => {
    accounts.set(uid, {
      disabled: false,
      metadata: { creationTime: new Date(created).toISOString() },
      providerData: google ? [{ providerId: 'google.com', uid: google }] : [],
    });
    await db
      .doc(`camellia_users/${uid}`)
      .set({ agreedAt: new Date(now).toISOString() });
  };
  await account('referrer');
  await account('new-a');
  const { token } = await service.issue('referrer');
  assert.equal(token.length, 43);
  assert.ok(
    !JSON.stringify(
      (
        await db.doc(`${root}/referral_codes/${referralHash(token)}`).get()
      ).data(),
    ).includes(token),
  );
  await assert.rejects(service.grant('new-a', token), {
    code: 'CAMPAIGN_NOT_CONFIGURED',
  });
  const config = {
    campaignId: 'local-test-only',
    accepting: true,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(now + 86400000).toISOString(),
    monthlyBudgetYen: 100,
    reservePerTrialYen: 10,
    trialAiRequests: 2,
    newcomerAfterCap: 'grant',
    overlapPolicy: 'reject_any_prior',
    decorationIds: ['local-fixture-one', 'local-fixture-two'],
    approvedThresholds: { value: 1, retention: 1, cost: 1 },
    approvals: {
      formalRelease: true,
      value: true,
      retention: true,
      cost: true,
      privacy: true,
      antiAbuse: true,
    },
    checkedAt: new Date(now).toISOString(),
  };
  await cfgRef.set(config);
  await assert.rejects(service.grant('referrer', token), {
    code: 'SELF_REFERRAL',
  });
  await account('old', undefined, start - 1000);
  await assert.rejects(service.grant('old', token), {
    code: 'NEW_REGISTRATION_REQUIRED',
  });
  const grants = await Promise.all([
    service.grant('new-a', token),
    service.grant('new-a', token),
  ]);
  assert.equal(grants.filter((x) => !x.reused).length, 1);
  assert.equal(Date.parse(grants[0].expiresAt) - now, 7 * 86400000);
  const membership = await memberStatus(db, 'new-a', now);
  assert.equal(membership.plan, 'plus');
  assert.equal(membership.paid, false);
  assert.equal(membership.sharingReady, false);
  await account('same-google', 'new-a');
  await assert.rejects(service.grant('same-google', token), {
    code: 'ALREADY_RECEIVED',
  });
  await account('same-referrer', 'referrer');
  await assert.rejects(service.grant('same-referrer', token), {
    code: 'SELF_REFERRAL',
  });
  for (const uid of ['new-b', 'new-c', 'new-d']) {
    await account(uid);
    await service.grant(uid, token);
  }
  const credits = await db
    .collection('camellia_users/referrer/admin/referral_decorations/items')
    .get();
  assert.equal(credits.size, 3);
  const credit = credits.docs[0].id;
  await service.claimDecoration('referrer', credit, 'local-fixture-one');
  await service.claimDecoration('referrer', credit, 'local-fixture-one');
  await assert.rejects(
    service.claimDecoration('referrer', credit, 'local-fixture-two'),
    { code: 'DECORATION_ALREADY_CHOSEN' },
  );
  assert.equal((await credits.docs[0].ref.get()).data().permanent, true);
  await cfgRef.update({ newcomerAfterCap: 'decline' });
  await account('cap-declined');
  await assert.rejects(service.grant('cap-declined', token), {
    code: 'REFERRER_MONTHLY_LIMIT',
  });
  assert.equal(
    (
      await db
        .doc(`${root}/referral_grants/${referralHash('cap-declined')}`)
        .get()
    ).exists,
    false,
  );
  await cfgRef.update({ newcomerAfterCap: 'grant', monthlyBudgetYen: 50 });
  await account('budget-one');
  await account('budget-two');
  const race = await Promise.allSettled([
    service.grant('budget-one', token),
    service.grant('budget-two', token),
  ]);
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    race.find((r) => r.status === 'rejected').reason.code,
    'BUDGET_LIMIT',
  );
  const budget = (
    await db.collection(`${root}/referral_budgets`).get()
  ).docs[0].data();
  assert.equal(budget.reservedYen, 50);
  await cfgRef.update({ accepting: false });
  const replay = await service.grant('new-a', token);
  assert.equal(replay.expiresAt, grants[0].expiresAt);
  assert.equal((await memberStatus(db, 'new-a', now)).plan, 'plus');
  await account('stopped');
  await assert.rejects(service.grant('stopped', token), {
    code: 'CAMPAIGN_STOPPED',
  });
  const request = randomUUID();
  await service.reserveTrialAi('new-a', request, 2);
  await service.reserveTrialAi('new-a', request, 2);
  await service.settleTrialAi('new-a', request, 1);
  await service.settleTrialAi('new-a', request, 1);
  assert.equal(
    (
      await db.doc(`${root}/referral_grants/${referralHash('new-a')}`).get()
    ).data().observedCostYen,
    1,
  );
  const quotas = await Promise.allSettled([
    service.reserveTrialAi('new-a', randomUUID(), 2),
    service.reserveTrialAi('new-a', randomUUID(), 2),
  ]);
  assert.equal(quotas.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    quotas.find((r) => r.status === 'rejected').reason.code,
    'TRIAL_AI_LIMIT',
  );
  const ct = env.authenticatedContext('new-a').firestore();
  for (const path of [
    `${root}/config/referral`,
    `${root}/referral_grants/${referralHash('new-a')}`,
    'camellia_users/new-a/admin/referral_trial',
    'camellia_users/referrer/admin/referral_decorations/items/forged',
    'camellia_auth_identities/forged',
  ])
    await assertFails(setDoc(doc(ct, path), { forged: true }));
  await assertFails(
    getDoc(doc(ct, `${root}/referral_grants/${referralHash('new-a')}`)),
  );
  await assertFails(
    getDoc(
      doc(env.unauthenticatedContext().firestore(), 'camellia_users/new-a'),
    ),
  );
  await service.revokeTrial('new-a', 'LOCAL OPERATOR', 'privacy_incident');
  assert.equal((await memberStatus(db, 'new-a', now)).plan, 'free');
  now += 8 * 86400000;
  assert.equal((await memberStatus(db, 'new-b', now)).plan, 'free');
  assert.equal((await credits.docs[0].ref.get()).data().permanent, true);
  console.log(
    'PASS local-only referral foundation: strict missing config, new verified registration, no self/linked duplication, atomic retry, exact seven days/no auto billing, monthly three permanent choices, explicit over-cap policy, concurrent budget/quota, existing grants survive stop, targeted revocation, expiry, protected ledgers. No campaign launched.',
  );
} finally {
  await env.cleanup();
  await server.close();
  await db.terminate();
  await deleteApp(app);
}
