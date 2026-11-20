import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085');
const app = initializeApp({ projectId: 'demo-camellia' }, 'referral-history'),
  db = getFirestore(app),
  root = 'camellia_admin/release_phase1',
  birth = Date.now() - 60000,
  hash = (v) => createHash('sha256').update(v).digest('hex');
let recreated = false;
const auth = {
  getUser: async () => ({
    disabled: false,
    metadata: {
      creationTime: new Date(recreated ? birth + 30000 : birth).toISOString(),
    },
    providerData: [],
  }),
  verifyIdToken: async (token) => {
    if (
      !['LOCAL-A', 'LOCAL-B', 'LOCAL-ANON', 'LOCAL-UNVERIFIED'].includes(token)
    )
      throw Error('INVALID');
    return {
      uid: token === 'LOCAL-B' ? 'history-B' : 'history-A',
      email_verified: token !== 'LOCAL-UNVERIFIED',
      firebase: {
        sign_in_provider: token === 'LOCAL-ANON' ? 'anonymous' : 'password',
      },
    };
  },
};
globalThis[Symbol.for('history-deps')] = { db, auth };
const vite = await createServer({
  configFile: false,
  root: process.cwd(),
  server: { middlewareMode: true, hmr: false },
  plugins: [
    {
      name: 'history-fixture',
      enforce: 'pre',
      resolveId(id) {
        if (id.endsWith('/server/admin.js')) return '\0history-admin';
      },
      load(id) {
        if (id === '\0history-admin')
          return 'export const SERVER_ROOT="camellia_admin/release_phase1";export const adminConfigured=()=>true;export const serverAdmin=()=>globalThis[Symbol.for("history-deps")];';
      },
    },
  ],
});
try {
  const { ReferralService } = await vite.ssrLoadModule(
      '/lib/referral/service.ts',
    ),
    { TreeDecorationService } = await vite.ssrLoadModule(
      '/lib/referral/decorations.ts',
    ),
    handler = (await vite.ssrLoadModule('/api/camellia/referral.ts')).default,
    service = new ReferralService(db, auth);
  const call = async (body, token) => {
    let status, value;
    await handler(
      {
        method: 'POST',
        headers: { authorization: token ? `Bearer ${token}` : '' },
        body,
      },
      {
        setHeader() {},
        status(c) {
          status = c;
          return {
            json(v) {
              value = v;
            },
          };
        },
      },
    );
    return { status, value };
  };
  delete process.env.CAMELLIA_REFERRAL_ENABLED;
  for (let n = 0; n < 24; n++)
    await db
      .doc(`${root}/referral_codes/${hash(`history-${n}`)}`)
      .set({
        ownerUid: 'history-A',
        ownerCreatedAt: birth,
        ownerIdentityCreatedAt: birth,
        createdAt: birth,
        identityKeys: ['PRIVATE IDENTITY HMAC'],
        revoked: false,
      });
  const first = await call({ operation: 'history' }, 'LOCAL-A');
  assert.equal(first.status, 200);
  assert.equal(first.value.links.length, 20);
  assert.ok(first.value.nextCursor);
  const second = await call(
    { operation: 'history', after: first.value.nextCursor },
    'LOCAL-A',
  );
  assert.equal(second.value.links.length, 4);
  assert.equal(
    new Set([...first.value.links, ...second.value.links].map((x) => x.id))
      .size,
    24,
  );
  for (const text of [
    'history-A',
    'PRIVATE IDENTITY HMAC',
    'ownerUid',
    'identityKeys',
    'token',
  ])
    assert.ok(!JSON.stringify(first.value).includes(text));
  assert.equal(
    (await call({ operation: 'history' }, 'LOCAL-B')).value.links.length,
    0,
  );
  const id = first.value.links[0].id;
  assert.equal(
    (await call({ operation: 'revoke', id }, 'LOCAL-B')).status,
    404,
  );
  assert.equal(
    (await call({ operation: 'revoke', id }, 'LOCAL-A')).value.revoked,
    true,
  );
  assert.equal(
    (await call({ operation: 'revoke', id }, 'LOCAL-A')).value.reused,
    true,
  );
  assert.equal((await call({ operation: 'issue' }, 'LOCAL-A')).status, 503);
  assert.equal(
    (await call({ operation: 'history' }, 'LOCAL-ANON')).status,
    403,
  );
  assert.equal(
    (await call({ operation: 'history' }, 'LOCAL-UNVERIFIED')).status,
    403,
  );
  assert.equal((await call({ operation: 'history' })).status, 401);
  await db.doc('camellia_users/history-A').delete();
  assert.equal(
    (await service.history('history-A')).links.length,
    20,
    'record reset does not prevent owner cleanup',
  );
  recreated = true;
  assert.equal((await service.history('history-A')).links.length, 0);
  await assert.rejects(
    () => service.revokeCode('history-A', id),
    (e) => e.code === 'REFERRAL_NOT_FOUND',
  );
  recreated = false;
  const credits = db.collection(
      'camellia_users/history-A/admin/referral_decorations/items',
    ),
    catalog = {
      approved: true,
      approvedBy: 'LOCAL',
      approvedAt: new Date().toISOString(),
      items: [
        {
          id: 'local-permanent',
          label: 'LOCAL DESIGN',
          assetPath: '/decorations/local.svg',
        },
      ],
    };
  await db.doc(`${root}/config/tree_decoration_catalog`).set(catalog);
  // More than a page of permanent credits must remain selectable/equippable without operator intervention.
  for (let n = 0; n < 103; n++)
    await credits
      .doc(n.toString(16).padStart(64, '0'))
      .set({
        permanent: true,
        claimed: false,
        catalogIds: ['local-permanent'],
      });
  const decorations = new TreeDecorationService(db, auth),
    laterId = (102).toString(16).padStart(64, '0');
  const page1 = await decorations.list('history-A');
  assert.equal(page1.choices.length, 100);
  assert.ok(page1.nextCursor);
  assert.equal(
    (await decorations.list('history-A', page1.nextCursor)).choices.length,
    3,
  );
  await decorations.claim('history-A', laterId, 'local-permanent');
  await decorations.equip('history-A', 'local-permanent');
  assert.equal(
    (await decorations.list('history-A')).active.id,
    'local-permanent',
    'active decoration lives beyond page one',
  );
  await decorations.equip('history-A', null);
  assert.equal((await credits.doc(laterId).get()).data().permanent, true);
  console.log(
    'PASS owner-only paged referral history/revoke with intake OFF, token/HMAC/recipient privacy, record reset access, Auth birth fence, anonymous/unverified denial, permanent decoration pagination and late-page claim/equip. Emulator/Auth fixtures only; no campaign or rewards enabled.',
  );
} finally {
  await vite.close();
  await db.terminate();
  await deleteApp(app);
  delete globalThis[Symbol.for('history-deps')];
}
