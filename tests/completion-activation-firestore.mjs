import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085');
const app = initializeApp(
    { projectId: 'demo-camellia' },
    'completion-activation',
  ),
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
    { ReferralRegistration } = await server.ssrLoadModule(
      '/lib/referral/registration.ts',
    ),
    { TreeDecorationService } = await server.ssrLoadModule(
      '/lib/referral/decorations.ts',
    ),
    { referralHash } = await server.ssrLoadModule('/lib/referral/identity.ts'),
    {
      NotificationDelivery,
      saveNotificationSettings,
      stopNotificationSettings,
      notificationPeriod,
    } = await server.ssrLoadModule('/lib/notifications/delivery.ts'),
    { PlaceService } = await server.ssrLoadModule('/lib/place/service.ts'),
    { PLACE_DEMO_DATA } = await server.ssrLoadModule('/data/place-demo.ts');
  const accounts = new Map(),
    auth = {
      getUser: async (uid) => {
        const a = accounts.get(uid);
        if (!a) throw new Error('NOT_FOUND');
        return a;
      },
    },
    account = async (uid, provider = 'google.com', at = Date.now()) => {
      accounts.set(uid, {
        disabled: false,
        metadata: { creationTime: new Date(at).toISOString() },
        providerData:
          provider === 'google.com' ? [{ providerId: provider, uid }] : [],
      });
      await db
        .doc(`camellia_users/${uid}`)
        .set({ agreedAt: new Date().toISOString() });
      if (provider === 'line')
        await db
          .doc(`camellia_auth_identities/activation-${uid}`)
          .set({
            provider: 'line',
            camelliaUid: uid,
            subjectHash: referralHash(uid),
          });
    };
  const now = Date.now(),
    config = {
      campaignId: 'activation-fixture-only',
      accepting: true,
      startsAt: new Date(now - 60000).toISOString(),
      endsAt: new Date(now + 86400000).toISOString(),
      monthlyBudgetYen: 100,
      reservePerTrialYen: 10,
      trialAiRequests: 2,
      newcomerAfterCap: 'grant',
      overlapPolicy: 'reject_any_prior',
      decorationIds: ['fixture-one', 'fixture-two'],
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
  await db.doc(`${root}/config/referral`).set(config);
  await account('activation-referrer');
  await account('activation-old', 'google.com', now - 86400000);
  const service = new ReferralService(db, auth),
    registration = new ReferralRegistration(db, auth),
    { token } = await service.issue('activation-referrer');
  const oldIntent = await registration.capture(token);
  await assert.rejects(
    registration.complete('activation-old', token, oldIntent.intent),
    { code: 'NEW_REGISTRATION_REQUIRED' },
  );
  for (const provider of ['google.com', 'line']) {
    const intent = await registration.capture(token),
      uid = `activation-${provider === 'line' ? 'line' : 'google'}`;
    await account(uid, provider);
    const results = await Promise.all([
      registration.complete(uid, token, intent.intent),
      registration.complete(uid, token, intent.intent),
    ]);
    assert.ok(results.every((v) => v.granted));
    assert.equal(results.filter((v) => !v.reused).length, 1);
    await assert.rejects(
      registration.complete('activation-old', token, intent.intent),
      { code: 'REGISTRATION_INTENT_INVALID' },
    );
  }
  const expired = await registration.capture(token);
  await account('activation-expired');
  await assert.rejects(
    new ReferralRegistration(db, auth, () => Date.now() + 11 * 60000).complete(
      'activation-expired',
      token,
      expired.intent,
    ),
    { code: 'REGISTRATION_INTENT_INVALID' },
  );
  const decorations = new TreeDecorationService(db, auth),
    initial = await decorations.list('activation-referrer');
  assert.equal(initial.catalogReady, false);
  assert.equal(initial.choices.length, 2);
  assert.equal(initial.choices[0].options.length, 0);
  await db.doc(`${root}/config/tree_decoration_catalog`).set({
    approved: true,
    approvedBy: 'LOCAL DESIGN REVIEW',
    approvedAt: new Date().toISOString(),
    items: [
      {
        id: 'fixture-one',
        label: 'LOCAL DESIGN ONE',
        assetPath: '/decorations/local-one.svg',
      },
      {
        id: 'fixture-two',
        label: 'LOCAL DESIGN TWO',
        assetPath: '/decorations/local-two.svg',
      },
    ],
  });
  const right = (await decorations.list('activation-referrer')).choices[0];
  await assert.rejects(
    decorations.claim('activation-old', right.creditId, 'fixture-one'),
  );
  await decorations.claim('activation-referrer', right.creditId, 'fixture-one');
  await decorations.claim('activation-referrer', right.creditId, 'fixture-one');
  await assert.rejects(
    decorations.claim('activation-referrer', right.creditId, 'fixture-two'),
  );
  await decorations.equip('activation-referrer', 'fixture-one');
  assert.equal(
    (await decorations.list('activation-referrer')).active.id,
    'fixture-one',
  );
  await db.doc(`${root}/config/referral`).update({ accepting: false });
  assert.equal((await decorations.list('activation-referrer')).owned.length, 1);
  await decorations.equip('activation-referrer', null);
  assert.equal((await decorations.list('activation-referrer')).owned.length, 1);
  const { PlaceService: PS } = { PlaceService };
  const places = new PS(db),
    op = { uid: 'activation-op', operator: true },
    staff = {
      uid: 'activation-store',
      operator: false,
      managedSlugs: ['activation-place'],
    },
    fixture = {
      ...PLACE_DEMO_DATA[0],
      slug: 'activation-place',
      name: 'LOCAL PLACE',
    };
  await places.change(staff, 'save', {
    place: fixture,
    expectedUpdatedAt: null,
  });
  const first = await places.detail(fixture.slug, staff);
  await places.change(staff, 'save', {
    place: { ...fixture, name: 'UPDATED LOCAL' },
    expectedUpdatedAt: first.updatedAt,
  });
  await assert.rejects(
    places.change(staff, 'save', {
      place: fixture,
      expectedUpdatedAt: first.updatedAt,
    }),
    { code: 'INVALID_TRANSITION' },
  );
  await assert.rejects(
    places.change(op, 'save', { place: fixture, expectedUpdatedAt: null }),
    { code: 'INVALID_TRANSITION' },
  );
  let time = Date.parse('2026-11-10T14:59:59Z');
  const prefs = {
      requested: true,
      topics: ['place', 'circle'],
      frequency: 'daily',
      updatedAt: new Date(time).toISOString(),
    },
    setup = async (uid) => {
      await db
        .doc(`camellia_users/${uid}`)
        .set({ agreedAt: new Date().toISOString() });
      await saveNotificationSettings(db, uid, prefs, 0);
      await db
        .doc(`camellia_users/${uid}/admin/notification_registration`)
        .set({ permission: 'granted', recipient: 'LOCAL-RECIPIENT' });
    };
  await db
    .doc(`${root}/config/notification_delivery`)
    .set({ approved: true, enabled: true });
  await setup('activation-notify');
  let calls = 0;
  const delivered = new NotificationDelivery(
    db,
    {
      idempotent: true,
      send: async (v) => {
        calls++;
        assert.deepEqual(v.payload, {
          title: 'Camellia',
          body: '今日は、自分のために何する？選択肢を見にいく。',
        });
        return 'delivered';
      },
    },
    () => time,
  );
  await Promise.all(
    Array.from({ length: 5 }, () =>
      delivered.send('activation-notify', 'place'),
    ),
  );
  assert.equal(calls, 1);
  await delivered.send('activation-notify', 'circle');
  assert.equal(calls, 1);
  time += 2000;
  await delivered.send('activation-notify', 'place');
  assert.equal(calls, 2);
  assert.equal(notificationPeriod('daily', time), '2026-11-11');
  assert.equal(notificationPeriod('weekly', time), '2026-11-09');
  await assert.rejects(
    saveNotificationSettings(db, 'activation-notify', prefs, 0),
    /PREFERENCES_CHANGED/,
  );
  await saveNotificationSettings(
    db,
    'activation-notify',
    { ...prefs, requested: false, topics: [] },
    1,
  );
  time += 86400000;
  await delivered.send('activation-notify', 'place');
  assert.equal(calls, 2);
  await setup('activation-unknown');
  let unknownCalls = 0;
  const unknown = new NotificationDelivery(
    db,
    {
      idempotent: true,
      send: async () => {
        unknownCalls++;
        throw new Error('ambiguous fixture');
      },
    },
    () => time,
  );
  await unknown.send('activation-unknown', 'place');
  await unknown.send('activation-unknown', 'place');
  assert.equal(unknownCalls, 1);
  await setup('activation-rejected');
  let rejectedCalls = 0;
  const retry = new NotificationDelivery(
    db,
    {
      idempotent: true,
      send: async () => (++rejectedCalls === 1 ? 'rejected' : 'delivered'),
    },
    () => time,
  );
  await retry.send('activation-rejected', 'place');
  await retry.send('activation-rejected', 'place');
  await retry.send('activation-rejected', 'place');
  assert.equal(rejectedCalls, 2);
  await setup('activation-race');
  let sends = 0,
    changed = false;
  const racingDb = new Proxy(db, {
    get(target, prop) {
      if (prop === 'doc')
        return (path) => {
          const ref = target.doc(path);
          if (
            path ===
            'camellia_users/activation-race/profile/notification_preferences'
          ) {
            const read = ref.get.bind(ref);
            ref.get = async () => {
              if (!changed) {
                changed = true;
                await saveNotificationSettings(
                  db,
                  'activation-race',
                  { ...prefs, requested: false, topics: [] },
                  1,
                );
              }
              return read();
            };
          }
          return ref;
        };
      const v = Reflect.get(target, prop);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
  await new NotificationDelivery(
    racingDb,
    {
      idempotent: true,
      send: async () => {
        sends++;
        return 'delivered';
      },
    },
    () => time,
  ).send('activation-race', 'place');
  assert.equal(sends, 0);
  assert.equal(
    (await new NotificationDelivery(db).send('activation-notify', 'place'))
      .state,
    'not_configured',
  );
  await db
    .doc('camellia_users/activation-unknown')
    .update({ personalDeleteInProgress: true });
  const { requireEligibleUser } = await server.ssrLoadModule(
    '/lib/server/eligibility.ts',
  );
  await assert.rejects(
    requireEligibleUser('synthetic', {
      db,
      auth: {
        verifyIdToken: async () => ({
          uid: 'activation-unknown',
          firebase: { sign_in_provider: 'google.com' },
        }),
      },
    }),
    (e) => e.stage === 'profile_storage',
  );
  await stopNotificationSettings(db, 'activation-unknown');
  assert.equal(
    (
      await db
        .doc(
          'camellia_users/activation-unknown/admin/notification_registration',
        )
        .get()
    ).exists,
    false,
  );
  console.log(
    'PASS server-timestamp registration intents, Google and LINE identity fixtures, concurrent completion idempotency, old-account/cross-user/expired rejection, earned decoration claim/equip/off/permanence, stale Place edit rejection, notification JST/global frequency/dedup/off/retry/unknown/opt-out race/no provider. Local emulator only; no campaign, payment or delivery activated.',
  );
} finally {
  await server.close();
  await db.terminate();
  await deleteApp(app);
}
