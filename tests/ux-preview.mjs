/** Isolated browser harness: real screens/store, synthetic auth, no Firebase/API/PostHog delivery.
 * Run only locally: node tests/ux-preview.mjs. Never use this configuration for a release build. */
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const state = `
const listeners=new Set();
export const schoolParkAuth={currentUser:sessionStorage.getItem('ux-signed-in')==='1'?{uid:'synthetic-ux-user',isAnonymous:false}:null};
export function setUser(user){schoolParkAuth.currentUser=user;user?sessionStorage.setItem('ux-signed-in','1'):sessionStorage.removeItem('ux-signed-in');listeners.forEach(fn=>fn(user));}
export function onAuthStateChanged(auth,fn){listeners.add(fn);queueMicrotask(()=>fn(auth.currentUser));return()=>listeners.delete(fn);}
`;
const mocks = {
  'firebase/auth': state,
  '@/lib/schoolpark/firebase': `export {schoolParkAuth} from 'firebase/auth';`,
  '@/lib/auth/camellia': `import{setUser}from'firebase/auth';
export const startLineLogin=()=>setUser({uid:'synthetic-ux-user',isAnonymous:false});
export const startSchoolParkLogin=startLineLogin;
export const finishAuthCallback=async()=>null;
export const logoutCamellia=async()=>setUser(null);
export const getLinkedCamelliaMethods=async()=>({line:true,schoolpark:true});`,
  '@/lib/schoolpark/sync': `const status={phase:'saved'};
export const syncToSchoolPark=()=>{};
export const prepareSchoolParkAccount=async s=>s;
export const deleteSyncedCamelliaData=async clear=>{clear();return{cloudDeleted:false}};
export const getSyncStatus=()=>status;
export const subscribeSyncStatus=()=>()=>{};
export const flushSchoolParkSync=async()=>{};`,
  '@/lib/analytics/posthog': `export const resetAnalyticsIdentity=()=>{};
export const forwardEvent=()=>true;`,
};
const server = await createServer({
  configFile: false, root,
  resolve: { alias: { '@': root } },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [{
    name: 'isolated-ux-only', enforce: 'pre',
    resolveId(id, importer) {
      if (id in mocks) return '\0ux:' + id;
      const path = id.startsWith('.') && importer ? resolve(dirname(importer), id) : id.startsWith('/') ? resolve(id) : id;
      for (const key of Object.keys(mocks))
        if (key.startsWith('@/') && path.replace(/\.tsx?$/, '') === resolve(root, key.slice(2))) return '\0ux:' + key;
    },
    load(id) { if (id.startsWith('\0ux:')) return mocks[id.slice(4)]; },
    configureServer(s) {
      s.middlewares.use((req, res, next) => {
        if (req.url !== '/') return next();
        void s.transformIndexHtml('/', '<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Camellia isolated UX test</title></head><body><div id="root"></div><script type="module" src="/tests/ux-preview-entry.tsx"></script></body></html>')
          .then(html => { res.setHeader('Content-Type','text/html'); res.end(html); });
      });
    },
  }, react()],
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
});
await server.listen();
console.log('Isolated UX harness ready on port 4173. Auth/sync/analytics are mocked; no production writes.');
