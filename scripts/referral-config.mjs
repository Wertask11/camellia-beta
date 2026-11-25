/**
 * Deliberate operator CLI; never called by builds or app routes.
 * Writes the owner-approved friend invitation campaign (2026-11-25 decision):
 *   both sides: Plus for 7 days, referrer: up to 3 rewards per JST month (permanent decoration),
 *   AI budget 10,000 JPY per month in total; when the budget is used, new rewards stop.
 *   node scripts/referral-config.mjs --show
 *   node scripts/referral-config.mjs --start "<approver name>" [--until 2027-03-31]
 *   node scripts/referral-config.mjs --stop
 * Also needs CAMELLIA_REFERRAL_ENABLED=true (server) and VITE_REFERRAL_ENABLED=true (build) in Vercel.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const args = process.argv.slice(2), operation = args[0], approvedBy = args[1];
const untilIndex = args.indexOf('--until'), until = untilIndex > 0 ? args[untilIndex + 1] : '2027-03-31';
if (!['--show', '--start', '--stop'].includes(operation) || (operation === '--start' && (!approvedBy?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(until))))
  throw new Error('Usage: node scripts/referral-config.mjs --show | --start "<approver>" [--until YYYY-MM-DD] | --stop');
const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 'null');
if (account?.project_id !== 'emusch-2a111') throw new Error('Expected Camellia project');
const db = getFirestore(initializeApp({ credential: cert(account) })),
  root = 'camellia_admin/release_phase1',
  referral = db.doc(`${root}/config/referral`),
  catalog = db.doc(`${root}/config/tree_decoration_catalog`),
  now = new Date().toISOString();
if (operation === '--show') console.log({ referral: (await referral.get()).data() ?? 'not configured', catalog: (await catalog.get()).data() ?? 'not configured' });
else if (operation === '--stop') {
  await referral.set({ accepting: false, stoppedAt: now }, { merge: true });
  console.log('Referral stopped. Rewards already granted stay.');
} else {
  await catalog.set({ approved: true, approvedBy: approvedBy.trim(), approvedAt: now, items: [{ id: 'camellia-blossom', label: '椿の花', assetPath: '/decorations/camellia-blossom.svg' }] });
  await referral.set({
    campaignId: 'launch-2026',
    accepting: true,
    startsAt: now,
    endsAt: `${until}T23:59:59+09:00`,
    monthlyBudgetYen: 10000,
    reservePerTrialYen: 50,
    trialAiRequests: 30,
    newcomerAfterCap: 'decline',
    overlapPolicy: 'reject_any_prior',
    decorationIds: ['camellia-blossom'],
    approvedThresholds: { value: 0, retention: 0, cost: 10000 },
    approvals: { formalRelease: true, value: true, retention: true, cost: true, privacy: true, antiAbuse: true },
    approvedBy: approvedBy.trim(),
    checkedAt: now,
  });
  console.log('Referral campaign launch-2026 is accepting until', until, '(10,000 JPY/month AI budget).');
}
