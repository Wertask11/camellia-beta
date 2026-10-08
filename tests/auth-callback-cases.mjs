import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, removeItem: key => storage.delete(key) };
globalThis.sessionStorage = { removeItem() {} };
const server = await createServer({
  configFile: false, root, resolve: { alias: { '@': root } },
  server: { middlewareMode: true }, appType: 'custom',
  plugins: [{
    name: 'isolated-auth', enforce: 'pre',
    resolveId(id) {
      if (id === 'firebase/auth') return '\0auth';
      if (id.includes('schoolpark/firebase')) return '\0schoolpark';
    },
    load(id) {
      if (id === '\0auth') return 'export const signInAnonymously=()=>{throw new Error("unexpected login")}; export const signInWithCustomToken=signInAnonymously; export const signOut=()=>{};';
      if (id === '\0schoolpark') return 'export const schoolParkAuth={authStateReady:async()=>{},currentUser:null};';
    },
  }],
});
try {
  for (const [query, expected] of [['error=access_denied&state=test', 'LINE_CANCELLED'], ['error=server_error&error_description=test', 'LINE_AUTH_FAILED']]) {
    storage.set('camellia-line-login', 'pending');
    globalThis.location = { href: `https://example.test/?utm_source=test&${query}#account` };
    let cleaned;
    globalThis.history = { replaceState: (_state, _title, url) => { cleaned = url; } };
    const auth = await server.ssrLoadModule(`/lib/auth/camellia.ts?case=${expected}`);
    await assert.rejects(auth.finishAuthCallback(), { message: expected });
    assert.equal(storage.has('camellia-line-login'), false);
    assert.equal(cleaned, '/?utm_source=test#account');
  }
  globalThis.location = { href: 'https://example.test/?utm_source=test' };
  const auth = await server.ssrLoadModule('/lib/auth/camellia.ts?case=no-callback');
  assert.equal(await auth.finishAuthCallback(), null);
  console.log('Auth callback: PASS (LINE cancellation/error notice path, pending login cleanup, unrelated URL preservation, normal entry).');
} finally {
  await server.close();
}
