import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
assert.ok(
  process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:'),
  'Local emulator only',
);
const projectId = 'demo-camellia',
  app = initializeApp({ projectId }, 'place-test'),
  db = getFirestore(app),
  root = process.cwd();
const server = await createServer({
  configFile: false,
  root,
  resolve: { alias: { '@': root } },
  server: { middlewareMode: true, hmr: false },
});
const env = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: await readFile('tests/fixtures/schoolpark.firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8085,
  },
});
const { PlaceService } = await server.ssrLoadModule('/lib/place/service.ts');
const service = new PlaceService(db),
  op = { uid: 'fixture-operator', operator: true },
  user = { uid: 'fixture-user', operator: false };
let count = 0;
const check = async (name, fn) => {
  await fn();
  console.log('PASS ' + name);
  count++;
};
// The fixture is fictional, remains in demo emulator only, and is never seeded in any deployed database.
const place = {
  slug: 'fixture-place',
  name: 'エミュレータ専用の架空場所',
  category: '本屋',
  region: '福岡県',
  area: '検証エリア',
  address: '検証専用',
  officialUrl: 'https://example.com/',
  imageUrls: ['https://example.com/photo.jpg'],
};
try {
  await env.clearFirestore();
  await check('non-operator cannot create or preview draft', async () => {
    await assert.rejects(service.change(user, 'save', { place }), {
      code: 'OPERATOR_REQUIRED',
    });
  });
  await service.change(op, 'save', {
    place: { ...place, status: 'published' },
  });
  await check(
    'unreviewed data never appears publicly; operator can preview',
    async () => {
      assert.equal((await service.list()).places.length, 0);
      await assert.rejects(service.detail(place.slug), { code: 'NOT_FOUND' });
      assert.equal((await service.detail(place.slug, op)).status, 'draft');
      await assert.rejects(service.detail(place.slug, user), {
        code: 'OPERATOR_REQUIRED',
      });
    },
  );
  await check('publish requires review and explicit verification', async () => {
    await assert.rejects(
      service.change(op, 'publish', { slug: place.slug, verified: true }),
      { code: 'INVALID_TRANSITION' },
    );
    await service.change(op, 'submit', { slug: place.slug });
    await assert.rejects(service.change(op, 'publish', { slug: place.slug }), {
      code: 'REVIEW_REQUIRED',
    });
    await service.change(op, 'publish', { slug: place.slug, verified: true });
    assert.equal((await service.list()).places.length, 1);
    assert.ok(
      !JSON.stringify(await service.detail(place.slug)).includes(
        'fixture-operator',
      ),
    );
  });
  await check(
    'bookmarks are account-scoped, durable and do not mutate profile archive',
    async () => {
      await service.bookmark(user.uid, place.slug, true);
      assert.equal((await service.saved(user.uid)).places.length, 1);
      assert.equal((await service.saved('other-user')).places.length, 0);
      const restored = await service.withSaved(
        [await service.detail(place.slug)],
        user.uid,
      );
      assert.equal(restored[0].saved, true);
    },
  );
  await check(
    'suspension hides details and saved-place metadata; unsave still works',
    async () => {
      await service.change(op, 'suspend', { slug: place.slug });
      assert.equal((await service.list()).places.length, 0);
      assert.equal((await service.saved(user.uid)).places.length, 0);
      await service.bookmark(user.uid, place.slug, false);
      await assert.rejects(service.bookmark(user.uid, place.slug, true), {
        code: 'NOT_FOUND',
      });
    },
  );
  await check(
    'published edits return to draft and partner publication requires separate confirmation',
    async () => {
      await service.change(op, 'save', {
        place: { ...place, partnerStatus: 'partner' },
      });
      await service.change(op, 'submit', { slug: place.slug });
      await assert.rejects(
        service.change(op, 'publish', { slug: place.slug, verified: true }),
        { code: 'REVIEW_REQUIRED' },
      );
      await service.change(op, 'publish', {
        slug: place.slug,
        verified: true,
        partnerConfirmed: true,
      });
      assert.equal(
        (await db.collection('camellia_admin/release_phase1/place_audit').get())
          .size,
        7,
      );
    },
  );
  await check(
    'client writes to public catalog denied; personal saves allow only the owner',
    async () => {
      const own = env.authenticatedContext(user.uid).firestore(),
        other = env.authenticatedContext('other-user').firestore();
      await assertFails(
        setDoc(doc(own, 'camellia_admin/release_phase1/places/forged'), place),
      );
      await assertSucceeds(
        getDoc(
          doc(own, `camellia_users/${user.uid}/place_saves/${place.slug}`),
        ),
      );
      await assertFails(
        getDoc(
          doc(other, `camellia_users/${user.uid}/place_saves/${place.slug}`),
        ),
      );
    },
  );
  console.log(
    `Place emulator: ${count} checks PASS; fictional local fixture only.`,
  );
} finally {
  await env.cleanup();
  await server.close();
  await deleteApp(app);
}
