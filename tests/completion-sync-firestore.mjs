import {setDoc,updateDoc} from 'firebase/firestore';
import { createServer as createTcpServer, connect } from 'node:net';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { resolve, dirname } from 'node:path';
import { Window } from 'happy-dom';
import {
  initializeTestEnvironment,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
assert.equal(
  process.env.FIRESTORE_EMULATOR_HOST,
  '127.0.0.1:8085',
  'Local demo only',
);
const env = await initializeTestEnvironment({
    projectId: 'demo-camellia',
    firestore: {
      host: '127.0.0.1',
      port: 8085,
      rules: await readFile(
        new URL('./fixtures/schoolpark.firestore.rules', import.meta.url),
        'utf8',
      ),
    },
  }),
  uid = 'completion-v4-owner',
  servers = [],
  windows = [];
let proxyEnabled = true;
const sockets = new Set();
const proxy = createTcpServer((socket) => {
  if (!proxyEnabled) {
    socket.destroy();
    return;
  }
  const upstream = connect(8085, '127.0.0.1');
  for (const link of [socket, upstream]) {
    sockets.add(link);
    link.on('close', () => sockets.delete(link));
    link.on('error', () => {
      socket.destroy();
      upstream.destroy();
    });
  }
  socket.pipe(upstream);
  upstream.pipe(socket);
});
await new Promise((resolve, reject) => {
  proxy.once('error', reject);
  proxy.listen(8086, '127.0.0.1', resolve);
});
const proxyEnv = await initializeTestEnvironment({
  projectId: 'demo-camellia',
  firestore: { host: '127.0.0.1', port: 8086 },
});
globalThis.__syncClients = {};
async function client(id) {
  const w = new Window({ url: 'http://localhost/' });
  windows.push(w);
  globalThis.window = w;
  globalThis.localStorage = w.localStorage;
  const db = (id === 'a' ? proxyEnv : env)
      .authenticatedContext(uid)
      .firestore(),
    c = {
      db,
      storage: w.localStorage,
      user: {
        uid,
        isAnonymous: false,
        getIdTokenResult: async () => ({ claims: {} }),getIdToken:async()=> 'LOCAL-SYNTHETIC-TOKEN',
      },
    };
  globalThis.__syncClients[id] = c;
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    resolve: { alias: { '@': process.cwd() } },
    server: { middlewareMode: true, hmr: { port: id === 'a' ? 24680 : 24681 } },
    plugins: [
      {
        name: 'independent-browser-context',
        enforce: 'pre',
        resolveId(name, importer) {
          const path =
            name.startsWith('.') && importer
              ? resolve(dirname(importer), name)
              : name;
          if (
            name.includes('schoolpark/firebase') ||
            /\/lib\/schoolpark\/firebase(?:\.ts)?$/.test(path)
          )
            return '\0firebase';
          if (name === 'firebase/auth') return '\0auth';
          if (name.includes('analytics/posthog')) return '\0analytics';
        },
        load(name) {
          if (name === '\0firebase')
            return `const c=globalThis.__syncClients['${id}'];export const schoolParkDb=c.db;export const schoolParkAuth={onAuthStateChanged(){return()=>{};},get currentUser(){return c.user;}};export const currentSchoolParkUser=async()=>c.user;`;
          if (name === '\0auth')
            return 'export const onAuthStateChanged=()=>()=>{};';
          if (name === '\0analytics')
            return 'export const forwardEvent=()=>false;export const resetAnalyticsIdentity=()=>{};export const setAnalyticsDeliveryAllowed=()=>{};';
        },
        transform(code, name) {
          if (name.endsWith('/lib/schoolpark/sync.ts'))
            return (
              `const localStorage=globalThis.__syncClients['${id}'].storage;\n` +
              code
            );
        },
      },
    ],
  });
  servers.push(server);
  return {
    ...c,
    server,
    sync: await server.ssrLoadModule('/lib/schoolpark/sync.ts'),
  };
}
try {
  const a = await client('a'),
    b = await client('b'),
    { emptyState } = await a.server.ssrLoadModule('/hooks/useCamelliaStore.ts'),
    { addPlaceExperience } = await a.server.ssrLoadModule(
      '/lib/place/experience.ts',
    ),
    { persistPersonalState } = await a.server.ssrLoadModule(
      '/lib/storage/persist.ts',
    ),
    { mergePersonalBackup } = await a.server.ssrLoadModule(
      '/lib/storage/backup.ts',
    );
  const at = new Date().toISOString();
  let state = emptyState();
  state.profile = {
    ...state.profile,
    id: 'same-private-profile',
    name: 'LOCAL QA',
    birthDate: '1995-01-01',
    agreedAt: at,
    womanSelfDeclared: true,
  };
  state.onboardingComplete = true;
  state.placeChoices = [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      slug: 'local-place',
      title: 'LOCAL PLACE',
      demo: false,
      createdAt: at,
      updatedAt: at,
    },
  ];
  const { validateStoredState } = await a.server.ssrLoadModule(
    '/lib/storage/validation.ts',
  );
  assert.deepEqual(validateStoredState(state, emptyState()).issues, []);
  const sync = async (c, s) => {
    c.storage.setItem('camellia-prototype-v3', JSON.stringify(s));
    c.sync.syncToSchoolPark(s);
    await new Promise((r) => setImmediate(r));
    await c.sync.flushSchoolParkSync();
  };
  await a.sync.prepareSchoolParkAccount(state, uid);
  await sync(a, state);
  assert.equal(a.sync.getSyncStatus().phase, 'saved');
  const oldB = await b.sync.prepareSchoolParkAccount(
    emptyState(),
    uid,
    'remote',
  );
  assert.equal(oldB.version, 3);
  globalThis.localStorage = a.storage;
  state = addPlaceExperience(state, {
    choiceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    actual: true,
    value: 'helpful',
    text: 'PRIVATE V4 TEST',
    remember: true,
  });
  persistPersonalState(state);
  assert.equal(
    JSON.parse(
      a.storage.getItem('camellia-local-backup:same-private-profile:pre-v4'),
    ).version,
    3,
  );
  await sync(a, state);
  assert.equal(a.sync.getSyncStatus().phase, 'saved');
  const stale = {
    ...oldB,
    personalMemories: [
      ...oldB.personalMemories,
      {
        id: 'local-unsent-memory',
        text: 'PRIVATE UNSENT',
        source: 'explicit_place',
        createdAt: at,
      },
    ],
  };
  await sync(b, stale);
  assert.equal(b.sync.getSyncStatus().error, 'SYNC_CONFLICT');
  assert.ok(
    b.storage.getItem('camellia-prototype-v3').includes('PRIVATE UNSENT'),
  );
  const reopened = await b.sync.prepareSchoolParkAccount(stale, uid, 'remote');
  assert.equal(reopened.version, 4);
  assert.equal(reopened.placeExperiences[0].text, 'PRIVATE V4 TEST');
  assert.ok(
    Object.keys(b.storage).some(
      (k) =>
        k.startsWith('camellia-local-backup:') &&
        b.storage.getItem(k).includes('PRIVATE UNSENT'),
    ),
  );
  const removed = {
    ...reopened,
    placeExperiences: reopened.placeExperiences.map((v) => ({
      ...v,
      value: undefined,
      status: 'removed',
      text: '',
      placeName: '',
      placeSlug: '',
      choiceId: '',
      updatedAt: new Date(Date.now() + 1).toISOString(),
    })),
  };
  assert.equal(
    mergePersonalBackup(removed, state).placeExperiences[0].status,
    'removed',
  );
  await sync(b, removed);
  const aReload = await a.sync.prepareSchoolParkAccount(state, uid, 'remote');
  assert.equal(aReload.placeExperiences[0].text, '');
  assert.equal(
    aReload.personalMemories.length,
    1,
    'Explicit Memory is separate from reflection deletion',
  );
  proxyEnabled = false;
  for (const socket of sockets) socket.destroy();
  const offline = {
    ...aReload,
    personalMemories: [
      ...aReload.personalMemories,
      {
        id: 'offline-new-record',
        text: 'PRIVATE OFFLINE',
        source: 'explicit_place',
        createdAt: at,
      },
    ],
  };
  await sync(a, offline);
  assert.equal(a.sync.getSyncStatus().phase, 'error');
  assert.ok(
    a.storage.getItem('camellia-prototype-v3').includes('PRIVATE OFFLINE'),
  );
  proxyEnabled = true;
  await a.sync.flushSchoolParkSync();
  assert.equal(a.sync.getSyncStatus().phase, 'saved');
  const own = globalThis.__syncClients.a.user;
  globalThis.__syncClients.a.user = null;
  await assert.rejects(
    a.sync.prepareSchoolParkAccount(aReload, uid),
    /ACCOUNT_REQUIRED/,
  );
  globalThis.__syncClients.a.user = own;
  assert.equal(
    (await a.sync.prepareSchoolParkAccount(aReload, uid, 'remote')).version,
    4,
  );
  await assertFails(
    getDocs(
      collection(
        env.authenticatedContext('other').firestore(),
        `camellia_users/${uid}/imports`,
      ),
    ),
  );
  const staleBeforeDelete = b.storage.getItem('camellia-prototype-v3');
  await setDoc(doc(a.db,`camellia_users/${uid}/partner_shares/local-hash`),{title:'LOCAL CATALOG TITLE'});
  const sharePath='camellia_admin/release_phase1/partner_shares/local-hash';await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),sharePath),{ownerUid:uid,content:{title:'LOCAL CATALOG TITLE'},revoked:false}));
  const notificationPath=`camellia_users/${uid}/profile/notification_preferences`;await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),notificationPath),{requested:true}));
  const originalFetch=globalThis.fetch;let shareAvailable=false,notificationStops=0;globalThis.fetch=async(url,options)=>{if(url==='/api/camellia/notification-settings'){assert.equal(options.method,'DELETE');assert.equal(options.headers.Authorization,'Bearer LOCAL-SYNTHETIC-TOKEN');notificationStops++;await env.withSecurityRulesDisabled(async c=>updateDoc(doc(c.firestore(),notificationPath),{requested:false}));return new Response('{}',{status:200});}if(url!=='/api/camellia/share')return originalFetch(url,options);assert.equal(options.headers.Authorization,'Bearer LOCAL-SYNTHETIC-TOKEN');assert.equal(JSON.parse(options.body).operation,'revokeAll');if(!shareAvailable)return new Response('{}',{status:503});await env.withSecurityRulesDisabled(async c=>updateDoc(doc(c.firestore(),sharePath),{content:{},revoked:true}));return new Response('{}',{status:200});};
  try{await assert.rejects(a.sync.deleteSyncedCamelliaData(()=>a.storage.clear()),/SHARE_REVOCATION_FAILED/);assert.ok(a.storage.getItem('camellia-prototype-v3'));assert.equal((await getDoc(doc(a.db,`camellia_users/${uid}`))).data().personalDeleteInProgress,true);await assert.rejects(b.sync.prepareSchoolParkAccount(removed,uid),/PERSONAL_DELETE_IN_PROGRESS/);shareAvailable=true;await a.sync.deleteSyncedCamelliaData(()=>a.storage.clear());}finally{globalThis.fetch=originalFetch;}assert.equal(notificationStops,2);
  await env.withSecurityRulesDisabled(async c=>{const v=(await getDoc(doc(c.firestore(),sharePath))).data();assert.equal(v.revoked,true);assert.deepEqual(v.content,{});});
  assert.equal(
    (await getDoc(doc(a.db, `camellia_users/${uid}`))).exists(),
    false,
  );
  assert.equal(
    (await getDocs(collection(a.db, `camellia_users/${uid}/imports`))).size,
    0,
  );
  await assert.rejects(
    b.sync.prepareSchoolParkAccount(removed, uid),
    /REMOTE_RECORDS_REMOVED/,
  );
  assert.equal(b.storage.getItem('camellia-prototype-v3'), staleBeforeDelete);
  const fresh = await b.sync.prepareSchoolParkAccount(
    removed,
    uid,
    'fresh',
    emptyState(),
  );
  assert.equal(fresh.placeExperiences?.length ?? 0, 0);
  assert.ok(
    Object.keys(b.storage).some((k) => k.startsWith('camellia-local-backup:')),
  );
  await sync(b, fresh);
  assert.equal(b.sync.getSyncStatus().phase, 'saved');
  console.log(
    'PASS actual Firestore client SDK: two isolated clients, v3→v4, exact backup, stale CAS rejection, remote restore and private backup, individual tombstone, offline protection/retry, logout/login, foreign-user denial, deletion lock, no automatic resurrection, explicit fresh start. Auth identities are emulator fixtures, not real LINE/Google.',
  );
} finally {
  for (const s of servers) await s.close();
  for (const w of windows) await w.happyDOM.close();
  proxyEnabled = true;
  await proxyEnv.cleanup();
  await env.cleanup();
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => proxy.close(resolve));
  delete globalThis.__syncClients;
}
