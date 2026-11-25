/**
 * Deliberate operator CLI; never called by builds or app routes.
 * Approves the owner's retention decision (2026-11-25) for the fixed operational collections:
 *   usage counters, rate windows and receipts: 90 days after they expire; expired partner share links: 30 days.
 *   Payment records (billing_*) are NOT in the cleanup list and are kept 7 years (tax law).
 *   node scripts/retention-policy.mjs --show | --approve "<approver>"
 * Deleting still needs a dry-run and an explicit apply per collection: node scripts/retention.mjs <collection>
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const [operation, approvedBy] = process.argv.slice(2);
if (!['--show', '--approve'].includes(operation) || (operation === '--approve' && !approvedBy?.trim()))
  throw new Error('Usage: node scripts/retention-policy.mjs --show | --approve "<approver>"');
const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 'null');
if (account?.project_id !== 'emusch-2a111') throw new Error('Expected Camellia project');
const ref = getFirestore(initializeApp({ credential: cert(account) })).doc('camellia_admin/release_phase1/config/retention');
const day = 86400000, now = new Date().toISOString();
const policy = (days) => ({ approved: true, retentionMs: days * day, approvedBy: approvedBy?.trim(), approvedAt: now });
if (operation === '--show') console.log((await ref.get()).data() ?? 'not configured');
else {
  const collections = {};
  for (const name of ['free_chat_days', 'rate_windows', 'partner_rate_windows', 'place_rate_windows', 'referral_rate_windows', 'referral_intents', 'place_metric_receipts', 'ai_usage_receipts', 'ai_request_receipts']) collections[name] = policy(90);
  collections.partner_shares = policy(30);
  await ref.set({ collections }, { merge: true });
  console.log('Retention approved: usage records 90 days, expired share links 30 days. Payment records are kept.');
}
