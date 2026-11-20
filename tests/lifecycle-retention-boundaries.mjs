import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  initializeTestEnvironment,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085');
const projectId = 'demo-camellia',
  app = initializeApp({ projectId }, 'lifecycle-boundaries'),
  db = getFirestore(app),
  root = 'camellia_admin/release_phase1',
  now = Date.now(),
  old = new Date(now - 86400000 * 90).toISOString(),
  hash = (s) => createHash('sha256').update(s).digest('hex');
const vite = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true, hmr: false },
  }),
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8085,
      rules: await readFile(
        'tests/fixtures/schoolpark.firestore.rules',
        'utf8',
      ),
    },
  });
try {
  const {
    lifecycleCleanup,
    reviewRetentionDisposition,
    LIFECYCLE_COLLECTIONS,
  } = await vite.ssrLoadModule('/lib/server/lifecycle-retention.ts');
  await assert.rejects(
    () =>
      lifecycleCleanup(db, 'referral_codes', {
        apply: true,
        approvedDigest: '../foreign',
      }),
    /PLAN_CHANGED/,
  );
  await assert.rejects(
    () => lifecycleCleanup(db, 'referral_codes', { now: NaN }),
    /INVALID_RETENTION_TIME/,
  );
  for (const collection of [...LIFECYCLE_COLLECTIONS, 'config']) {
    const client = env
        .authenticatedContext('LOCAL-UNPRIVILEGED-OWNER')
        .firestore(),
      ref = doc(client, `${root}/${collection}/forged`);
    await assertFails(getDoc(ref));
    await assertFails(
      setDoc(ref, { approved: true, ownerUid: 'LOCAL-UNPRIVILEGED-OWNER' }),
    );
  }
  await db.recursiveDelete(db.doc(root));
  const policy = async (c, mode) =>
    db.doc(`${root}/config/retention`).set({
      lifecycleVersion: 'lifecycle_v1',
      collections: {
        [c]: {
          approved: true,
          approvedBy: 'LOCAL',
          approvedAt: old,
          retentionMs: 86400000,
          mode,
        },
      },
    });
  const review = {
    reviewedBy: 'LOCAL',
    reason: 'LOCAL CLOSED CASE',
    closedAt: old,
  };
  const cleanup = async (c) => {
    const p = await lifecycleCleanup(db, c, { now });
    return lifecycleCleanup(db, c, {
      now,
      apply: true,
      approvedDigest: p.digest,
    });
  };
  await policy('ai_request_receipts', 'closed_request');
  await db
    .doc(`${root}/ai_request_receipts/uncertain`)
    .set({ state: 'started', createdAt: old });
  assert.equal(
    (await lifecycleCleanup(db, 'ai_request_receipts', { now })).held
      .UNSETTLED_PROVIDER_USAGE,
    1,
  );
  await reviewRetentionDisposition(db, 'ai_request_receipts', 'uncertain', {
    ...review,
    providerUsageReviewed: true,
  });
  assert.equal(
    (await lifecycleCleanup(db, 'ai_request_receipts', { now })).eligible,
    1,
  );
  await cleanup('ai_request_receipts');
  await policy('retention_dispositions', 'closed_review');
  const disposition = db.doc(
    `${root}/retention_dispositions/${hash(`${root}/ai_request_receipts/uncertain`)}`,
  );
  await disposition.update({ reviewedAt: old });
  await cleanup('retention_dispositions');
  assert.equal((await disposition.get()).exists, false);
  await policy('retention_holds', 'released_hold');
  const hold = db.doc(
    `${root}/retention_holds/${hash(`${root}/ai_request_receipts/uncertain`)}`,
  );
  await hold.set({
    active: true,
    releasedAt: old,
    targetCollection: 'ai_request_receipts',
    targetId: 'uncertain',
  });
  assert.equal(
    (await lifecycleCleanup(db, 'retention_holds', { now })).held.LEGAL_HOLD,
    1,
  );
  await hold.update({ active: false });
  await cleanup('retention_holds');
  assert.equal((await hold.get()).exists, false);
  await policy('place_scope_audit', 'closed_scope');
  await db
    .doc('camellia_users/LOCAL-STAFF/admin/place_scope')
    .set({ slugs: ['local-store'], updatedAt: old });
  await db
    .doc(`${root}/place_scope_audit/closed`)
    .set({ targetUid: 'LOCAL-STAFF', at: old });
  await reviewRetentionDisposition(db, 'place_scope_audit', 'closed', {
    ...review,
    scopesRevokedReviewed: true,
  });
  assert.equal(
    (await lifecycleCleanup(db, 'place_scope_audit', { now })).held
      .ACTIVE_PLACE_SCOPE,
    1,
  );
  await db
    .doc('camellia_users/LOCAL-STAFF/admin/place_scope')
    .update({ slugs: [] });
  await cleanup('place_scope_audit');
  await policy('place_application_audit', 'closed_application');
  await db
    .doc(`${root}/place_application_audit/orphan`)
    .set({ applicationId: 'already-deleted', createdAt: old });
  assert.equal(
    (await lifecycleCleanup(db, 'place_application_audit', { now })).held
      .APPLICATION_CLOSURE_REVIEW_REQUIRED,
    1,
  );
  await reviewRetentionDisposition(db, 'place_application_audit', 'orphan', {
    ...review,
    applicationClosureReviewed: true,
  });
  await cleanup('place_application_audit');
  await policy('referral_budgets', 'closed_budget');
  await db.doc(`${root}/referral_budgets/2026-08`).set({ reservedYen: 0 });
  assert.equal(
    (await lifecycleCleanup(db, 'referral_budgets', { now })).held
      .BUDGET_CLOSURE_REVIEW_REQUIRED,
    1,
  );
  await reviewRetentionDisposition(db, 'referral_budgets', '2026-08', {
    ...review,
    budgetClosureReviewed: true,
  });
  await cleanup('referral_budgets');
  await assert.rejects(
    () =>
      reviewRetentionDisposition(db, 'ai_request_receipts', 'x', {
        ...review,
        arbitraryPath: 'PRIVATE',
      }),
    /INVALID_RETENTION_REVIEW/,
  );
  console.log(
    'PASS real local Rules reject all lifecycle/private config reads and writes, unknown-provider manual closure, review/hold own lifecycle, live staff scope hold, orphan intake audit review, monthly budget review, invalid review fields. Local emulator only; no real admin roles, cloud jobs or provider actions.',
  );
} finally {
  await env.cleanup();
  await vite.close();
  await db.terminate();
  await deleteApp(app);
}
