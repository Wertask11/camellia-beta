import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085', 'Local demo emulator only');
const app = initializeApp({ projectId: 'demo-camellia' }, 'place-introductions'), db = getFirestore(app);
const server = await createServer({ configFile: false, root: process.cwd(), resolve: { alias: { '@': process.cwd() } }, server: { middlewareMode: true, hmr: false } });
const root = 'camellia_admin/release_phase1';
const { places } = JSON.parse(readFileSync('data/place-introductions-fukuoka.json', 'utf8'));
const slugs = places.map((p) => p.slug);
try {
  const { importIntroductionDrafts } = await server.ssrLoadModule('/lib/place/introduction-drafts.ts');
  await db.doc(`${root}/places/${slugs[0]}`).set({ slug: slugs[0], name: 'EXISTING', status: 'published' });
  const dry = await importIntroductionDrafts(db, places, false);
  assert.equal(dry.created.length, 25);
  assert.equal((await db.doc(`${root}/places/${slugs[1]}`).get()).exists, false, 'dry run writes nothing');
  const run = await importIntroductionDrafts(db, places, true, '2026-11-25T00:00:00.000Z');
  assert.deepEqual(run.skipped, [slugs[0]], 'an existing place is never overwritten');
  assert.equal((await db.doc(`${root}/places/${slugs[0]}`).get()).data().name, 'EXISTING');
  const saved = (await db.doc(`${root}/places/${slugs[1]}`).get()).data();
  assert.equal(saved.status, 'draft', 'saved as draft, not published');
  assert.equal(saved.listingType, 'introduction');
  assert.equal((await importIntroductionDrafts(db, places, true)).created.length, 0, 'running again changes nothing');
  console.log('place introduction import: ok');
} finally {
  for (const slug of slugs) await db.doc(`${root}/places/${slug}`).delete();
  for (const doc of (await db.collection(`${root}/place_audit`).where('operatorUid', '==', 'script:place-introductions').get()).docs) await doc.ref.delete();
  await server.close();
  await deleteApp(app);
}
