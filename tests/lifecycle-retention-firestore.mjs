import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085');
const app = initializeApp(
    { projectId: 'demo-camellia' },
    'lifecycle-retention',
  ),
  db = getFirestore(app),
  vite = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true, hmr: false },
  }),
  root = 'camellia_admin/release_phase1',
  hash = (s) => createHash('sha256').update(s).digest('hex');
try {
  await db.recursiveDelete(db.doc(root));
  const {
      lifecycleCleanup,
      reviewRetentionDisposition,
      LIFECYCLE_COLLECTIONS,
    } = await vite.ssrLoadModule('/lib/server/lifecycle-retention.ts'),
    { expiryCleanup } = await vite.ssrLoadModule('/lib/server/retention.ts');
  const now = Date.parse('2026-11-20T00:00:00Z'),
    old = new Date(now - 90 * 86400000).toISOString(),
    policy = (mode) => ({
      approved: true,
      approvedBy: 'LOCAL OPERATOR',
      approvedAt: old,
      retentionMs: 86400000,
      mode,
    }),
    config = db.doc(`${root}/config/retention`);
  const setPolicy = async (name, mode, extra = {}) =>
    config.set({
      lifecycleVersion: 'lifecycle_v1',
      paused: false,
      collections: { [name]: { ...policy(mode), ...extra } },
    });
  const run = async (name) => {
    const p = await lifecycleCleanup(db, name, { now });
    assert.equal(p.apply, false);
    const applied = await lifecycleCleanup(db, name, {
      now,
      apply: true,
      approvedDigest: p.digest,
    });
    assert.equal(applied.deleted, p.eligible);
    return applied;
  };
  await assert.rejects(
    () => lifecycleCleanup(db, 'camellia_users', { now }),
    /NOT_ALLOWED/,
  );
  await config.delete();
  await assert.rejects(
    () => lifecycleCleanup(db, 'referral_codes', { now }),
    /NOT_APPROVED/,
  );
  const uid = 'LOCAL PERMANENT OWNER',
    grant = hash(uid);
  await db.doc(`camellia_users/${uid}`).set({ kept: 'PRIVATE ARCHIVE' });
  await db
    .doc(`camellia_users/${uid}/admin/referral_decorations/items/credit`)
    .set({ claimed: true, permanent: true, decorationId: 'LOCAL_ONLY' });
  await db
    .doc(`${root}/referral_codes/closed`)
    .set({ ownerUid: uid, createdAt: Date.parse(old), revoked: true });
  await db
    .doc(`${root}/referral_codes/live`)
    .set({
      ownerUid: uid,
      ownerCreatedAt: (
        await db.doc(`camellia_users/${uid}`).get()
      ).createTime.toMillis(),
      createdAt: Date.parse(old),
      revoked: false,
    });
  await setPolicy('referral_codes', 'revoked_only');
  const plan = await lifecycleCleanup(db, 'referral_codes', { now });
  assert.equal(plan.eligible, 1);
  assert.equal(plan.held.ACTIVE_CODE, 1);
  assert.ok((await db.doc(`${root}/referral_codes/closed`).get()).exists);
  await config.update({ paused: true });
  await assert.rejects(
    () =>
      lifecycleCleanup(db, 'referral_codes', {
        now,
        apply: true,
        approvedDigest: plan.digest,
      }),
    /PAUSED/,
  );
  await assert.rejects(
    () => expiryCleanup(db, 'referral_intents', { now }),
    /PAUSED/,
  );
  await config.update({ paused: false });
  await assert.rejects(
    () =>
      lifecycleCleanup(db, 'referral_codes', {
        now,
        apply: true,
        approvedDigest: plan.digest,
      }),
    /PLAN_CHANGED/,
  );
  let p = await lifecycleCleanup(db, 'referral_codes', { now });
  await db
    .doc(`${root}/retention_holds/${hash(`${root}/referral_codes/closed`)}`)
    .set({ active: true });
  await assert.rejects(
    () =>
      lifecycleCleanup(db, 'referral_codes', {
        now,
        apply: true,
        approvedDigest: p.digest,
      }),
    /PLAN_CHANGED/,
  );
  p = await lifecycleCleanup(db, 'referral_codes', { now });
  assert.equal(p.held.LEGAL_HOLD, 1);
  await db
    .doc(`${root}/retention_holds/${hash(`${root}/referral_codes/closed`)}`)
    .delete();
  p = await lifecycleCleanup(db, 'referral_codes', { now });
  await lifecycleCleanup(db, 'referral_codes', {
    now,
    apply: true,
    approvedDigest: p.digest,
  });
  assert.equal(
    (
      await lifecycleCleanup(db, 'referral_codes', {
        now,
        apply: true,
        approvedDigest: p.digest,
      })
    ).reused,
    true,
  );
  await db
    .doc(`${root}/referral_grants/${grant}`)
    .set({
      ownerUid: uid,
      uidHash: grant,
      expiresAt: old,
      createdAt: old,
      budgetReconciled: true,
    });
  await db
    .doc(`camellia_users/${uid}/admin/referral_trial`)
    .set({ grantId: grant, expiresAt: old });
  await db
    .doc(`${root}/referral_ai_reservations/resolved`)
    .set({ grantId: grant, createdAt: Date.parse(old), released: true });
  await db
    .doc(`${root}/referral_ai_reservations/unknown`)
    .set({
      grantId: grant,
      createdAt: Date.parse(old),
      dispatched: true,
      usageIncomplete: true,
    });
  await setPolicy('referral_ai_reservations', 'settled_trial');
  p = await lifecycleCleanup(db, 'referral_ai_reservations', { now });
  assert.equal(p.eligible, 1);
  assert.equal(p.held.UNSETTLED_TRIAL, 1);
  await run('referral_ai_reservations');
  await setPolicy('referral_grants', 'reconciled_trial');
  assert.equal(
    (await lifecycleCleanup(db, 'referral_grants', { now })).held
      .DEPENDENT_LEDGER,
    1,
  );
  await db
    .doc(`${root}/referral_ai_reservations/unknown`)
    .update({ released: true });
  await setPolicy('referral_ai_reservations', 'settled_trial');
  await run('referral_ai_reservations');
  await db
    .doc(`${root}/referral_identities/email_hash`)
    .set({ grantId: grant, createdAt: Date.parse(old) });
  await setPolicy('referral_identities', 'closed_identity_window', {
    identityWindowDeletionApproved: true,
  });
  await db.doc(`${root}/config/referral`).set({ accepting: true, endsAt: old });
  assert.equal(
    (await lifecycleCleanup(db, 'referral_identities', { now })).held
      .IDENTITY_WINDOW_NOT_REVIEWED,
    1,
  );
  await db.doc(`${root}/config/referral`).update({ accepting: false });
  await run('referral_identities');
  await setPolicy('referral_grants', 'reconciled_trial');
  await run('referral_grants');
  assert.equal(
    (await db.doc(`camellia_users/${uid}/admin/referral_trial`).get()).exists,
    false,
  );
  assert.equal(
    (
      await db
        .doc(`camellia_users/${uid}/admin/referral_decorations/items/credit`)
        .get()
    ).data().permanent,
    true,
  );
  assert.equal(
    (await db.doc(`camellia_users/${uid}`).get()).data().kept,
    'PRIVATE ARCHIVE',
  );
  // Circle: open cases and children fence deletion; legacy reaction keys resolve target kind safely.
  await db
    .doc(`${root}/circle_posts/post1`)
    .set({ status: 'deleted', text: '', updatedAt: old });
  await db
    .doc(`${root}/circle_comments/comment1`)
    .set({
      postId: 'post1',
      status: 'active',
      text: 'PRIVATE COMMENT',
      updatedAt: old,
    });
  await db
    .doc(`${root}/circle_reactions/comment_comment1_actor`)
    .set({ targetId: 'comment1', actorId: 'actor', updatedAt: old });
  await db
    .doc(`${root}/circle_reports/report1`)
    .set({
      targetId: 'comment1',
      targetKind: 'comment',
      status: 'open',
      createdAt: old,
    });
  await setPolicy('circle_comments', 'removed_content', {
    parentCascadeReviewed: true,
  });
  p = await lifecycleCleanup(db, 'circle_comments', { now });
  assert.equal(p.eligible, 0);
  await db
    .doc(`${root}/circle_reports/report1`)
    .update({ status: 'resolved', resolvedAt: old });
  await setPolicy('circle_reactions', 'removed_parent');
  assert.equal(
    (await lifecycleCleanup(db, 'circle_reactions', { now })).eligible,
    0,
  );
  await db
    .doc(`${root}/circle_comments/comment1`)
    .update({ status: 'removed', text: '' });
  await run('circle_reactions');
  await setPolicy('circle_comments', 'removed_content');
  await run('circle_comments');
  await setPolicy('circle_posts', 'removed_content');
  await run('circle_posts');
  // Payment data: legal approval is distinct from personal-record reset and provider closure.
  const customer = db.doc(
    `${root}/billing_customers/${hash('stripe:cus_local')}`,
  );
  await customer.set({ uid, provider: 'stripe', identityCreatedAt: old });
  await setPolicy('billing_customers', 'closed_payment');
  await assert.rejects(
    () => lifecycleCleanup(db, 'billing_customers', { now }),
    /LEGAL_REVIEW/,
  );
  await setPolicy('billing_customers', 'closed_payment', {
    legalReviewApproved: true,
    legalBasis: 'LOCAL SYNTHETIC LEGAL REVIEW',
  });
  assert.equal(
    (await lifecycleCleanup(db, 'billing_customers', { now })).eligible,
    0,
  );
  await reviewRetentionDisposition(db, 'billing_customers', customer.id, {
    providerClosed: true,
    managementNoLongerRequired: true,
    legalReviewApproved: true,
    reviewedBy: 'LOCAL',
    reason: 'SYNTHETIC CLOSED ACCOUNT',
    closedAt: old,
  });
  await db
    .doc(`camellia_users/${uid}/admin/billing_subscription`)
    .set({
      plan: 'plus',
      status: 'active',
      expiresAt: new Date(now + 86400000).toISOString(),
    });
  assert.equal(
    (await lifecycleCleanup(db, 'billing_customers', { now })).held
      .ACTIVE_PAYMENT_RIGHT,
    1,
  );
  await db
    .doc(`camellia_users/${uid}/admin/billing_subscription`)
    .update({ status: 'expired', expiresAt: old });
  await run('billing_customers');
  assert.equal(
    (await db.doc(`camellia_users/${uid}/admin/billing_subscription`).get())
      .exists,
    false,
  );
  assert.equal(
    (
      await db
        .doc(`camellia_users/${uid}/admin/referral_decorations/items/credit`)
        .get()
    ).exists,
    true,
  );
  // Calendar-derived legacy monthly counters and aggregates have no invented write-time date.
  await db
    .doc(`${root}/referral_rewards/${hash(uid)}_2026-10`)
    .set({ count: 3 });
  await db
    .doc(`${root}/referral_rewards/${hash(uid)}_2026-11`)
    .set({ count: 3 });
  await setPolicy('referral_rewards', 'closed_month');
  p = await lifecycleCleanup(db, 'referral_rewards', { now });
  assert.equal(p.eligible, 1);
  assert.equal(p.held.ACTIVE_PERIOD, 1);
  await run('referral_rewards');
  assert.ok(LIFECYCLE_COLLECTIONS.includes('ai_attempt_days'));
  await db
    .doc(`${root}/ai_attempt_days/old`)
    .set({ date: '2026-09-01', attempts: 1 });
  await db
    .doc(`${root}/ai_attempt_days/today`)
    .set({ date: '2026-11-20', attempts: 1 });
  await setPolicy('ai_attempt_days', 'closed_day');
  assert.equal(
    (await lifecycleCleanup(db, 'ai_attempt_days', { now })).eligible,
    1,
  );
  // Legacy expiry worker holds active leases, unresolved usage and active intake audits.
  const past = new Date(now - 10 * 86400000),
    expired = new Date(now - 9 * 86400000);
  for (const c of [
    'ai_request_receipts',
    'ai_usage_receipts',
    'place_application_audit',
  ]) {
    await config.set({ collections: { [c]: policy('expiry') } });
    await db
      .doc(`${root}/${c}/protected`)
      .set({
        createdAt: past,
        expiresAt: expired,
        ...(c === 'ai_request_receipts'
          ? { state: 'started' }
          : c === 'ai_usage_receipts'
            ? { usageIncomplete: true }
            : { applicationId: 'active-app' }),
      });
    if (c === 'place_application_audit')
      await db
        .doc(`${root}/place_applications/active-app`)
        .set({ status: 'review', scopeGranted: false, closedAt: old });
    assert.equal((await expiryCleanup(db, c, { now })).eligible, 0);
  }
  // Explicit closed Place scopes, closure-version review and dependency ordering.
  await db
    .doc(`${root}/places/closed-place`)
    .set({ status: 'suspended', updatedAt: old });
  await db
    .doc(`${root}/place_agreements/closed-place`)
    .set({ slug: 'closed-place', acceptedAt: old });
  await setPolicy('places', 'closed_place', {
    permissionEvidenceClosureReviewed: true,
  });
  assert.equal((await lifecycleCleanup(db, 'places', { now })).eligible, 0);
  await reviewRetentionDisposition(db, 'places', 'closed-place', {
    scopesRevokedReviewed: true,
    reviewedBy: 'LOCAL',
    reason: 'LOCAL CLOSED SCOPE',
    closedAt: old,
  });
  await setPolicy('place_agreements', 'closed_place', {
    permissionEvidenceClosureReviewed: true,
  });
  await run('place_agreements');
  await setPolicy('places', 'closed_place', {
    permissionEvidenceClosureReviewed: true,
  });
  p = await lifecycleCleanup(db, 'places', { now });
  assert.equal(p.eligible, 1);
  await db
    .doc(`${root}/places/closed-place`)
    .update({ updatedAt: old, revision: 2 });
  assert.equal(
    (await lifecycleCleanup(db, 'places', { now })).held
      .PLACE_SCOPE_REVIEW_REQUIRED,
    1,
  );
  await assert.rejects(
    () =>
      lifecycleCleanup(db, 'places', {
        now,
        apply: true,
        approvedDigest: p.digest,
      }),
    /PLAN_CHANGED/,
  );
  // Bounded pagination protects the current month and never loses held first-page rows.
  await db.recursiveDelete(db.collection(`${root}/ai_attempt_days`));
  for (let n = 0; n < 23; n++)
    await db
      .doc(`${root}/ai_attempt_days/day_${String(n).padStart(2, '0')}`)
      .set({ date: '2026-09-01' });
  await setPolicy('ai_attempt_days', 'closed_day');
  p = await lifecycleCleanup(db, 'ai_attempt_days', { now });
  assert.equal(p.scanned, 20);
  assert.ok(p.nextCursor);
  const page2 = await lifecycleCleanup(db, 'ai_attempt_days', {
    now,
    after: p.nextCursor,
  });
  assert.equal(page2.scanned, 3);
  const applied = await lifecycleCleanup(db, 'ai_attempt_days', {
    now,
    after: p.nextCursor,
    apply: true,
    approvedDigest: page2.digest,
  });
  assert.equal(applied.deleted, 3);
  console.log(
    'PASS approval/default stop, emergency pause, legal holds, stale dependency/config rejection, idempotent retry, reconciled referral ordering/permanent rights, Circle open-case/child fences, closed payment review/active rights, legacy calendar counters. Emulator only; no actual users/payment/deletion job enabled.',
  );
} finally {
  await vite.close();
  await db.terminate();
  await deleteApp(app);
}
