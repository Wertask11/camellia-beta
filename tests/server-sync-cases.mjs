import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({configFile:false, root, resolve:{alias:{'@':root}}, server:{middlewareMode:true}, appType:'custom'});
try {
  const {readServerConsent, SERVER_CONSENT_KEY, SERVER_CONSENT_VERSION} = await server.ssrLoadModule('/lib/server-sync/index.ts');
  const values = new Map();
  globalThis.window = {};
  globalThis.localStorage = {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  assert.equal(readServerConsent(), null);
  values.set(SERVER_CONSENT_KEY, JSON.stringify({version:'old',acceptedAt:new Date().toISOString()}));
  assert.equal(readServerConsent(), null);
  const acceptedAt = new Date().toISOString();
  values.set(SERVER_CONSENT_KEY, JSON.stringify({version:SERVER_CONSENT_VERSION,acceptedAt}));
  assert.deepEqual(readServerConsent(), {version:SERVER_CONSENT_VERSION,acceptedAt});
  console.log('server sync: PASS (no upload contract without exact consent record)');
} finally {
  delete globalThis.window; delete globalThis.localStorage; await server.close();
}
