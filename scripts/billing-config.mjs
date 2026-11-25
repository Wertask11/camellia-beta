/**
 * Deliberate operator CLI; never called by builds or app routes.
 * Approves (or stops) Stripe billing for Camellia Plus at 500 JPY / month.
 *   node scripts/billing-config.mjs --show
 *   node scripts/billing-config.mjs --approve <price_ID> "<approver name>"
 *   node scripts/billing-config.mjs --stop
 * Stopping blocks new checkout and webhook processing; already paid periods stay valid.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const [operation, priceId, approvedBy] = process.argv.slice(2);
if (!['--show', '--approve', '--stop'].includes(operation) || (operation === '--approve' && (!/^price_[A-Za-z0-9]+$/.test(priceId ?? '') || !approvedBy?.trim())))
  throw new Error('Usage: node scripts/billing-config.mjs --show | --approve <price_ID> "<approver>" | --stop');
const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 'null');
if (account?.project_id !== 'emusch-2a111') throw new Error('Expected Camellia project');
const db = getFirestore(initializeApp({ credential: cert(account) })),
  ref = db.doc('camellia_admin/release_phase1/config/billing');
if (operation === '--show') console.log((await ref.get()).data() ?? 'not configured');
else if (operation === '--stop') {
  await ref.set({ enabled: false, stoppedAt: new Date().toISOString() }, { merge: true });
  console.log('Billing stopped. New checkout and webhook processing are blocked.');
} else {
  await ref.set({ approved: true, enabled: true, provider: 'stripe', priceYen: 500, currency: 'JPY', interval: 'month', monthlyPriceId: priceId, approvedBy: approvedBy.trim(), approvedAt: new Date().toISOString() });
  console.log('Billing approved for', priceId, '. STRIPE_PLUS_PRICE_ID in Vercel must be the same price.');
}
