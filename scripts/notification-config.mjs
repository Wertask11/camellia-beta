/**
 * Deliberate operator CLI; never called by builds or app routes.
 *   node scripts/notification-config.mjs --show | --start "<approver>" | --stop
 * Start only after VAPID keys, CAMELLIA_NOTIFICATIONS_ENABLED=true and CRON_SECRET are set in Vercel.
 * Policy (owner, 2026-11-25): Web Push, at most once a day and three times a week, generic text only.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const [operation, approvedBy] = process.argv.slice(2);
if (!['--show', '--start', '--stop'].includes(operation) || (operation === '--start' && !approvedBy?.trim()))
  throw new Error('Usage: node scripts/notification-config.mjs --show | --start "<approver>" | --stop');
const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 'null');
if (account?.project_id !== 'emusch-2a111') throw new Error('Expected Camellia project');
const ref = getFirestore(initializeApp({ credential: cert(account) })).doc('camellia_admin/release_phase1/config/notification_delivery');
if (operation === '--show') console.log((await ref.get()).data() ?? 'not configured');
else if (operation === '--stop') {
  await ref.set({ enabled: false, stoppedAt: new Date().toISOString() }, { merge: true });
  console.log('Notification delivery stopped.');
} else {
  await ref.set({ approved: true, enabled: true, provider: 'webpush', maxPerDay: 1, maxPerWeek: 3, approvedBy: approvedBy.trim(), approvedAt: new Date().toISOString() });
  console.log('Notification delivery approved (1/day, 3/week).');
}
