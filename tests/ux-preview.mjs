/** Isolated browser harness: real screens/store, synthetic auth, no Firebase/API/PostHog delivery.
 * Run only locally: node tests/ux-preview.mjs. Never use this configuration for a release build. */
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const checkFirst = process.env.CHECK_FIRST_FIXTURE === 'on';
// Historical browser fixtures keep their original entry. The new journey opts in explicitly.
process.env.VITE_CHECK_FIRST_ONBOARDING = checkFirst ? 'true' : 'off';
const state = `
const listeners=new Set();
export const schoolParkAuth={currentUser:sessionStorage.getItem('ux-signed-in')==='1'?{uid:sessionStorage.getItem('ux-auth-uid')||'synthetic-ux-user',isAnonymous:false,providerData:[],getIdToken:async()=>'synthetic',getIdTokenResult:async()=>({signInProvider:'custom',claims:{}})}:null};
export function setUser(user){if(user)sessionStorage.setItem('ux-auth-uid',user.uid);else sessionStorage.removeItem('ux-auth-uid');schoolParkAuth.currentUser=user;user?sessionStorage.setItem('ux-signed-in','1'):sessionStorage.removeItem('ux-signed-in');listeners.forEach(fn=>fn(user));}
export function onAuthStateChanged(auth,fn){listeners.add(fn);queueMicrotask(()=>fn(auth.currentUser));return()=>listeners.delete(fn);}
// Google login (added after this harness was written). Popups never open here; LINE is the synthetic login.
export class GoogleAuthProvider{static PROVIDER_ID='google.com';setCustomParameters(){}}
export async function signInWithPopup(){
 if(${checkFirst}){
  const mode=sessionStorage.getItem('ux-auth-mode');
  if(mode==='cancel')throw Object.assign(new Error('synthetic cancellation'),{code:'auth/popup-closed-by-user'});
  if(mode==='error')throw Object.assign(new Error('synthetic network error'),{code:'auth/network-request-failed'});
  const user={uid:sessionStorage.getItem('ux-login-uid')||'synthetic-ux-user',isAnonymous:false,providerData:[],getIdToken:async()=>'synthetic',getIdTokenResult:async()=>({signInProvider:'google.com',claims:{}})};setUser(user);return{user};
 }
 throw Object.assign(new Error('synthetic harness'),{code:'auth/popup-blocked'});
}
export const linkWithPopup=signInWithPopup;
export const signOut=async()=>setUser(null);
export const signInAnonymously=async()=>{throw new Error('unused synthetic anonymous login');};
export const signInWithCustomToken=async()=>{throw new Error('unused synthetic token exchange');};
`;
const mocks = {
  'firebase/auth': state,
  '@/lib/schoolpark/firebase': `export {schoolParkAuth} from 'firebase/auth';`,
  '@/lib/auth/camellia': `import{setUser}from'firebase/auth';
import{bridgeGuestOAuth,cancelGuestLogin,clearGuestCheck,completeGuestOAuth,readGuestCheck}from'@/lib/onboarding/guest-check';
export const startLineLogin=()=>{
 const uid=sessionStorage.getItem('ux-login-uid')||'synthetic-ux-user';
 if(${checkFirst}){
  const state='synthetic-line-state-local-only';
  if(sessionStorage.getItem('ux-auth-mode')==='cancel'){cancelGuestLogin();sessionStorage.setItem('ux-auth-return','cancel');location.assign('/');return;}
  if(readGuestCheck())bridgeGuestOAuth(state);
  setUser({uid,isAnonymous:false,providerData:[],getIdToken:async()=>'synthetic',getIdTokenResult:async()=>({signInProvider:'custom',claims:{}})});
  if(readGuestCheck())completeGuestOAuth(state,uid);
  sessionStorage.setItem('ux-auth-return','line');location.assign('/');return;
 }
 setUser({uid,isAnonymous:false,providerData:[],getIdToken:async()=>'synthetic',getIdTokenResult:async()=>({signInProvider:'custom',claims:{}})});
};
export const startSchoolParkLogin=startLineLogin;
export const finishAuthCallback=async()=>{const r=sessionStorage.getItem('ux-auth-return');sessionStorage.removeItem('ux-auth-return');if(r==='cancel')throw new AuthFlowError('LINE_CANCELLED','line','provider_return','user_cancelled',true);return r==='line'?{method:'line',linked:false}:null;};
export class AuthFlowError extends Error{constructor(message,method,stage,reason,returned){super(message);Object.assign(this,{method,stage,reason,returned});}}
export const ensureGuestSession=async()=>null;
export const logoutCamellia=async()=>{clearGuestCheck();setUser(null);};
export const getLinkedCamelliaMethods=async()=>({line:true,schoolpark:true});
export const CAMELLIA_AUTH_API='/__ux/camellia-auth';
export const authHeaders=async()=>({});`,
  '@/lib/schoolpark/sync': `const status={phase:'saved'};
export const syncToSchoolPark=()=>{};
export const prepareSchoolParkAccount=async(s,uid)=>{const raw=sessionStorage.getItem('ux-account-state:'+uid);return raw?JSON.parse(raw):s;};
export const deleteSyncedCamelliaData=async clear=>{clear();return{cloudDeleted:false}};
export const getSyncStatus=()=>status;
export const subscribeSyncStatus=()=>()=>{};
export const flushSchoolParkSync=async()=>{};`,
  '@/lib/analytics/posthog': `export const resetAnalyticsIdentity=()=>{};
export const forwardEvent=()=>true;
export const captureAuthEvent=(name,properties)=>{if(${checkFirst})window.dispatchEvent(new CustomEvent('ux-auth-event',{detail:{name,properties}}));return true;};
export const setAnalyticsDeliveryAllowed=()=>{};`,
};
const server = await createServer({
  configFile: false, root,
  cacheDir: root + '/node_modules/.vite-ux-preview-' + (checkFirst ? 'check-first' : 'legacy'),
  resolve: { alias: { '@': root }, dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime', 'lucide-react'] },
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
      /* Synthetic invite/suspension answers (lib/auth/access.ts). Cookie ux-access=invite|suspended|open
         chooses the state; the code K7QM2XPA is accepted. Nothing leaves this machine. */
      /* Synthetic conversation: the reply in pieces (lib/conversation/stream.ts), starting quickly so the tests can
         see the reaction on her message hold it back. Nothing is sent to any provider. */
      s.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/camellia/chat') return next();
        res.setHeader('Content-Type', req.method === 'GET' ? 'application/json' : 'text/event-stream');
        if (req.method === 'GET') return res.end(JSON.stringify({ enabled: true }));
        let raw = ''; req.on('data', chunk => { raw += chunk; });
        req.on('end', () => {
          const message = String(JSON.parse(raw || '{}').message ?? ''), modelId = JSON.parse(raw || '{}').modelId ?? 'yura';
          const reply = /つらい/.test(message) ? 'そうだったんだね。話してくれてありがとう。' : /できた|やった|やりき/.test(message) ? 'すごい、最後までやりきったんだね。' : 'それはうれしいね。';
          const send = value => res.write(`data: ${JSON.stringify(value)}\n\n`);
          send({ type: 'start' });
          setTimeout(() => { send({ type: 'delta', text: reply.slice(0, 6) }); setTimeout(() => { send({ type: 'delta', text: reply }); send({ type: 'done', reply, provider: 'gemini', modelId }); res.end(); }, 3500); }, 150);
        });
      });
      s.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/__ux/camellia-auth/')) return next();
        const mode = /(?:^|; )ux-access=(\w+)/.exec(req.headers.cookie ?? '')?.[1] ?? 'open';
        const send = (status, body, cookie) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); if (cookie) res.setHeader('Set-Cookie', cookie); res.end(JSON.stringify(body)); };
        if (req.url.endsWith('/access')) return send(200, { ok: true, inviteRequired: mode !== 'open', needsInvite: mode === 'invite', suspended: mode === 'suspended', admitted: mode === 'admitted' });
        if (req.url.endsWith('/invite/redeem')) {
          let raw = ''; req.on('data', chunk => { raw += chunk; });
          req.on('end', () => { const code = JSON.parse(raw || '{}').code; if (code === 'K7QM2XPA') send(200, { ok: true, already: false, kind: 'operator', label: 'instagram_1027' }, 'ux-access=admitted; Path=/'); else send(404, { error: 'INVITE_NOT_FOUND' }); });
          return;
        }
        return send(404, { error: 'NOT_FOUND' });
      });
      s.middlewares.use((req, res, next) => {
        // Also with a query (invite links: /?invite=…).
        if (req.url?.split('?')[0] !== '/') return next();
        void s.transformIndexHtml('/', '<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Camellia isolated UX test</title></head><body><div id="root"></div><script type="module" src="/tests/ux-preview-entry.tsx"></script></body></html>')
          .then(html => { res.setHeader('Content-Type','text/html'); res.end(html); });
      });
    },
  }, react()],
  server: { host: '127.0.0.1', port: 4173, strictPort: true, hmr: false },
});
await server.listen();
console.log('Isolated UX harness ready on port 4173. Auth/sync/analytics are mocked; no production writes.');
