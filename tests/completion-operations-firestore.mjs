import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(
  process.env.FIRESTORE_EMULATOR_HOST,
  '127.0.0.1:8085',
  'Local only',
);
const app = initializeApp({ projectId: 'demo-camellia' }, 'completion-ops'),
  db = getFirestore(app),
  root = 'camellia_admin/release_phase1',
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true, hmr: false },
  });
try {
  const { changePlaceScope } = await server.ssrLoadModule(
      '/lib/place/scope-service.ts',
    ),
    { managedPlaceSlugs } = await server.ssrLoadModule(
      '/lib/place/operator.ts',
    ),
    { expiryCleanup } = await server.ssrLoadModule('/lib/server/retention.ts');
  const auth = {
      getUser: async (uid) => ({
        disabled: false,
        customClaims: uid === 'operator' ? { camelliaPlaceOperator: true } : {},
      }),
    },
    input = {
      actorUid: 'operator',
      targetUid: 'store',
      slugs: ['only-own-place'],
      reason: 'LOCAL FIXTURE',
      apply: false,
    };
  await assert.rejects(
    changePlaceScope(db, auth, { ...input, actorUid: 'not-operator' }),
    /OPERATOR_REQUIRED/,
  );
  assert.equal((await changePlaceScope(db, auth, input)).apply, false);
  assert.deepEqual(await managedPlaceSlugs(db, 'store'), []);
  await changePlaceScope(db, auth, { ...input, apply: true });
  assert.deepEqual(await managedPlaceSlugs(db, 'store'), ['only-own-place']);
  await changePlaceScope(db, auth, { ...input, slugs: [], apply: true });
  assert.deepEqual(await managedPlaceSlugs(db, 'store'), []);
  assert.equal(
    (await db.collection(`${root}/place_scope_audit`).get()).size,
    2,
  );
  await assert.rejects(
    changePlaceScope(db, auth, { ...input, targetUid: 'bad/path' }),
    /INVALID_SCOPE/,
  );
  const disabledAuth = {
    getUser: async (uid) =>
      uid === 'operator' ? auth.getUser(uid) : { disabled: true },
  };
  await assert.rejects(
    changePlaceScope(db, disabledAuth, { ...input, apply: true }),
    /STAFF_DISABLED/,
  );
  await changePlaceScope(db, disabledAuth, {
    ...input,
    slugs: [],
    apply: true,
  });
  const deletedAuth = {
    getUser: async (uid) => {
      if (uid === 'operator') return auth.getUser(uid);
      throw new Error('auth/user-not-found');
    },
  };
  await changePlaceScope(db, deletedAuth, { ...input, slugs: [], apply: true });
  const c = 'place_metric_receipts',
    now = Date.now(),
    collection = db.collection(`${root}/${c}`);
  await collection.doc('expired').set({
    createdAt: new Date(now - 100000),
    expiresAt: new Date(now - 50000),
  });
  await collection
    .doc('fresh')
    .set({ createdAt: new Date(now), expiresAt: new Date(now + 100000) });
  await collection
    .doc('unknown-legacy-date')
    .set({ expiresAt: new Date(now - 50000) });
  await assert.rejects(expiryCleanup(db, c), /NOT_APPROVED/);
  await db.doc(`${root}/config/retention`).set({
    collections: {
      [c]: {
        approved: true,
        retentionMs: 1000,
        approvedBy: 'LOCAL OPERATOR',
        approvedAt: new Date(now).toISOString(),
      },
    },
  });
  const plan = await expiryCleanup(db, c, { now });
  assert.equal(plan.eligible, 1);
  assert.equal(plan.held, 1);
  assert.equal((await collection.doc('expired').get()).exists, true);
  await assert.rejects(
    expiryCleanup(db, c, { apply: true, approvedDigest: 'wrong', now }),
    /PLAN_CHANGED/,
  );
  await collection.doc('expired').update({ changed: true });
  await assert.rejects(
    expiryCleanup(db, c, { apply: true, approvedDigest: plan.digest, now }),
    /PLAN_CHANGED/,
  );
  const latest = await expiryCleanup(db, c, { now });
  assert.equal(
    (
      await expiryCleanup(db, c, {
        apply: true,
        approvedDigest: latest.digest,
        now,
      })
    ).deleted,
    1,
  );
  assert.equal((await collection.doc('expired').get()).exists, false);
  assert.equal((await collection.doc('fresh').get()).exists, true);
  assert.equal(
    (await collection.doc('unknown-legacy-date').get()).exists,
    true,
  );
  assert.equal((await db.collection(`${root}/retention_audit`).get()).size, 1);
  await assert.rejects(expiryCleanup(db, '../camellia_users'), /NOT_ALLOWED/);
  console.log(
    'PASS operator-only scope dry-run/grant/revoke/audit, pending retention stops, approved job dry-run, stale approval rejection, actual expiry deletion, fresh/unknown records held, fixed collection boundary. No Production action.',
  );
} finally {
  await server.close();
  await db.terminate();
  await deleteApp(app);
}
