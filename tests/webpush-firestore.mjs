import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085', 'Local demo emulator only');
const app = initializeApp({ projectId: 'demo-camellia' }, 'webpush'), db = getFirestore(app);
const server = await createServer({ configFile: false, root: process.cwd(), resolve: { alias: { '@': process.cwd() } }, server: { middlewareMode: true, hmr: false } });
const root = 'camellia_admin/release_phase1', uid = 'webpush-local-owner';
try {
  const { registerPushRecipient, deliverDueNotifications, saveNotificationSettings } = await server.ssrLoadModule('/lib/notifications/delivery.ts');
  const sent = [];
  let reply = 'delivered';
  const driver = { idempotent: true, send: async (r) => (sent.push(r.recipient), reply) };
  await db.doc(`camellia_users/${uid}`).set({ profile: 'LOCAL' });
  await saveNotificationSettings(db, uid, { requested: true, topics: ['reflection'], frequency: 'daily', updatedAt: '2026-11-30T00:00:00Z' }, null);
  await registerPushRecipient(db, uid, 'https://fcm.googleapis.com/fcm/send/LOCAL');
  let now = Date.parse('2026-11-30T03:00:00Z'); // Monday 12:00 JST
  assert.deepEqual(await deliverDueNotifications(db, driver, () => now), { stopped_or_duplicate: 1 }, 'nothing is sent before the operator approves');
  assert.equal(sent.length, 0);
  await db.doc(`${root}/config/notification_delivery`).set({ approved: true, enabled: true });
  assert.equal((await deliverDueNotifications(db, driver, () => now)).delivered, 1);
  assert.equal((await deliverDueNotifications(db, driver, () => now)).stopped_or_duplicate, 1, 'at most once a day');
  for (const day of [1, 2]) { now += 86400000; assert.equal((await deliverDueNotifications(db, driver, () => now)).delivered, 1, `day ${day + 1}`); }
  now += 86400000;
  assert.equal((await deliverDueNotifications(db, driver, () => now)).stopped_or_duplicate, 1, 'fourth day in the same week is skipped (3 per week)');
  assert.equal(sent.length, 3);
  now = Date.parse('2026-12-07T03:00:00Z'); // next Monday
  reply = 'rejected';
  assert.equal((await deliverDueNotifications(db, driver, () => now)).rejected, 1, 'new week sends again');
  assert.equal((await db.doc(`camellia_users/${uid}/admin/notification_registration`).get()).exists, false, 'an ended browser subscription is forgotten');
  now += 86400000; reply = 'delivered';
  assert.equal((await deliverDueNotifications(db, driver, () => now)).stopped_or_duplicate, 1, 'no registration, no send');
  await saveNotificationSettings(db, uid, { requested: false, topics: [], frequency: 'daily', updatedAt: '2026-12-08T00:00:00Z' }, null);
  assert.equal((await deliverDueNotifications(db, driver, () => now)).skipped, 1, 'turning notifications off stops them');
  console.log('PASS Web Push job on emulator: waits for operator approval, 1/day, 3/week, new week resumes, ended subscriptions removed, opt-out respected. Fake driver only.');
} finally {
  for (const name of ['notification_recipients', 'notification_deliveries']) await db.recursiveDelete(db.collection(`${root}/${name}`));
  await db.doc(`${root}/config/notification_delivery`).delete(); await db.recursiveDelete(db.doc(`camellia_users/${uid}`));
  await server.close(); await db.terminate(); await deleteApp(app);
}
