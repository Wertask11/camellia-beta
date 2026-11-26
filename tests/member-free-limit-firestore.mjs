import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085', 'Local demo emulator only');
const app = initializeApp({ projectId: 'demo-camellia' }, 'member-free-limit'), db = getFirestore(app);
const server = await createServer({ configFile: false, root: process.cwd(), resolve: { alias: { '@': process.cwd() } }, server: { middlewareMode: true, hmr: false } });
const root = 'camellia_admin/release_phase1';
try {
  const { takeMemberFreeDaily } = await server.ssrLoadModule('/lib/membership/ai-basic-limit.ts');
  const now = Date.parse('2026-11-26T03:00:00Z');
  for (let i = 0; i < 30; i++) assert.equal(await takeMemberFreeDaily(db, 'free-member', now), true, `reply ${i + 1} of 30`);
  await assert.rejects(takeMemberFreeDaily(db, 'free-member', now), { code: 'FREE_DAILY_LIMIT' }, 'the 31st reply of the JST day is refused as a daily limit');
  assert.equal(await takeMemberFreeDaily(db, 'free-member', Date.parse('2026-11-26T15:00:01Z')), true, 'a new JST day starts at midnight Japan time');
  assert.equal(await takeMemberFreeDaily(db, 'other-member', now), true, 'each account has its own count');
  await db.doc('camellia_users/plus-member/admin/subscription').set({ plan: 'plus', source: 'operator_trial', status: 'trialing', expiresAt: '2026-12-31T00:00:00Z' });
  for (let i = 0; i < 35; i++) assert.equal(await takeMemberFreeDaily(db, 'plus-member', now), true);
  console.log('PASS logged-in Free: 30 AI replies per JST day per account, daily limit reported as such, Plus unchanged.');
} finally {
  await db.recursiveDelete(db.collection(`${root}/member_free_chat_days`));
  await db.recursiveDelete(db.doc('camellia_users/plus-member'));
  await server.close(); await db.terminate(); await deleteApp(app);
}
