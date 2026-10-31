/** Local synthetic storage/identity only; no real OAuth, account or Firestore access. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import { createElement, act, useEffect } from 'react';
const dom = new Window({ url: 'http://localhost/' });
for (const key of ['window', 'document', 'HTMLElement', 'Event', 'localStorage', 'sessionStorage']) globalThis[key] = key === 'window' ? dom : dom[key];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({ configFile: false, root: process.cwd(), resolve: { alias: { '@': process.cwd() } }, server: { middlewareMode: true, hmr: false }, plugins: [{
  name: 'check-first-synthetic', enforce: 'pre',
  resolveId(id) { if (id.includes('schoolpark/sync')) return '\0guest-sync'; if (id.includes('analytics/posthog')) return '\0guest-analytics'; },
  load(id) {
    if (id === '\0guest-sync') return 'export const syncToSchoolPark=()=>{};export const prepareSchoolParkAccount=async s=>s;export const deleteSyncedCamelliaData=async clear=>clear();';
    if (id === '\0guest-analytics') return 'export const forwardEvent=()=>false;export const resetAnalyticsIdentity=()=>{};export const setAnalyticsDeliveryAllowed=()=>{};';
  },
}] });
let root;
try {
  const guest = await server.ssrLoadModule('/lib/onboarding/guest-check.ts');
  guest.clearGuestCheck();
  const first = guest.createGuestCheck({ mood: 2, sleep: 5.5, body: '疲れ気味', text: 'must never persist', uid: 'no-account', periodDays: 9 }, crypto.randomUUID());
  assert.equal(localStorage.getItem(guest.GUEST_OAUTH_KEY), null, 'ordinary guest Check never writes a localStorage bridge');
  const raw = sessionStorage.getItem(guest.GUEST_CHECK_KEY);
  for (const forbidden of ['must never persist', 'no-account', 'periodDays']) assert.ok(!raw.includes(forbidden));
  assert.equal(guest.markGuestShown('result'), true); assert.equal(guest.markGuestShown('result'), false);
  const reloaded = await server.ssrLoadModule('/lib/onboarding/guest-check.ts?test=reload');
  assert.equal(reloaded.readGuestCheck().check.id, first.check.id);
  assert.equal(guest.parseGuestCheck({ ...first, expiresAt: NaN }), undefined);
  assert.equal(guest.parseGuestCheck(first, first.expiresAt + 1), undefined);
  assert.equal(guest.guestCheckValue({ ...first.check, mood: 6 }), undefined);
  assert.equal(guest.guestCheckValue({ ...first.check, body: {} }), undefined);
  assert.equal(guest.guestCheckValue({ ...first.check, sleep: Infinity }), undefined);
  assert.equal(guest.guestForAccount('A'), undefined, 'preview is never implicitly owned');
  guest.armGuestLogin('google'); guest.cancelGuestLogin();
  assert.equal(guest.readGuestCheck().check.id, first.check.id, 'cancel preserves the preview');
  assert.equal(guest.readGuestCheck().phase, 'preview');
  guest.armGuestLogin('google'); assert.equal(guest.completeGuestGoogle('A'), true);
  assert.equal(guest.guestForAccount('B'), undefined);
  assert.equal(guest.completeGuestGoogle('B'), false, 'a later account cannot claim the completed attempt');
  assert.equal(guest.finishGuestTransfer(first.check.id, 'B'), false);
  assert.equal(guest.finishGuestTransfer(first.check.id, 'A'), true);
  assert.equal(guest.finishGuestTransfer(first.check.id, 'A'), false, 'handoff consumed once');
  assert.equal(guest.readGuestCheck(), undefined);

  const line = guest.createGuestCheck({ mood: 4 }); guest.armGuestLogin('line');
  assert.equal(guest.bridgeGuestOAuth('unit-state-with-at-least-sixteen'), true);
  const originalSession = globalThis.sessionStorage;
  globalThis.sessionStorage = new Window().sessionStorage;
  const otherTab = await server.ssrLoadModule('/lib/onboarding/guest-check.ts?test=other-tab');
  assert.equal(otherTab.completeGuestOAuth('unit-state-with-at-least-sixteen', 'A'), true);
  assert.equal(otherTab.guestForAccount('A').check.id, line.check.id);
  assert.equal(localStorage.getItem(guest.GUEST_OAUTH_KEY), null);
  otherTab.clearGuestCheck(); globalThis.sessionStorage = originalSession; guest.clearGuestCheck();
  const expiring = guest.createGuestCheck({ mood: 3 }); guest.armGuestLogin('line'); guest.bridgeGuestOAuth('unit-expiring-oauth-state');
  const expired = await server.ssrLoadModule('/lib/onboarding/guest-check.ts?test=expired-bridge');
  assert.equal(expired.completeGuestOAuth('unit-expiring-oauth-state', 'B', Date.now() + guest.GUEST_OAUTH_TTL_MS + 100), false);
  assert.equal(localStorage.getItem(guest.GUEST_OAUTH_KEY), null);
  assert.equal(guest.readGuestCheck().check.id, expiring.check.id);
  guest.clearGuestCheck();
  assert.equal(sessionStorage.getItem(guest.GUEST_CHECK_KEY), null);
  console.log('PASS guest storage: bounded fixed fields, reload, expiry, cancel/retry, one-use cross-tab LINE handoff, account binding and clear');

  const { useCamelliaStore, STORAGE_KEY } = await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
  let store;
  function Harness() { const value = useCamelliaStore(); useEffect(() => { store = value; }); return null; }
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const pause = () => new Promise(resolve => setTimeout(resolve, 20));
  await act(async () => { root.render(createElement(Harness)); await pause(); });
  await act(pause);
  const draft = guest.createGuestCheck({ mood: 5, sleep: 8 });
  assert.equal(store.state.checkins.length, 0);
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).checkins.length, 0, 'guest Check is outside the persistent personal archive');
  const id = store.state.profile.id;
  await act(async () => { store.adoptGuestCheck(draft.check, id, () => true, guest.guestEventProperties(draft)); await pause(); });
  assert.equal(store.state.checkins.length, 0, 'incomplete profile cannot receive the guest record');
  await act(async () => { store.updateProfile({ name: 'Local test', birthDate: '1995-01-01', womanSelfDeclared: true, agreedAt: new Date().toISOString() }); store.completeOnboarding(); await pause(); });
  await act(async () => { store.adoptGuestCheck(draft.check, 'another-profile', () => true, {}); store.adoptGuestCheck(draft.check, id, () => false, {}); await pause(); });
  assert.equal(store.state.checkins.length, 0, 'profile and current-account guards');
  await act(async () => { store.adoptGuestCheck(draft.check, id, () => true, guest.guestEventProperties(draft)); store.adoptGuestCheck(draft.check, id, () => true, guest.guestEventProperties(draft)); await pause(); });
  assert.equal(store.state.checkins.length, 1);
  assert.equal(store.state.checkins[0].id, draft.check.id);
  assert.equal(store.state.analyticsEvents.filter(e => e.name === 'check_complete').length, 0, 'import does not replay Check completion');
  assert.equal(store.state.analyticsEvents.filter(e => e.name === 'guest_check_saved').length, 1);
  assert.equal(store.hasPersistedCheck(draft.check.id, id), true);
  await act(async () => { store.resumeGuestCheck(draft.check.id, id, {}); store.resumeGuestCheck(draft.check.id, id, {}); await pause(); });
  assert.equal(store.state.analyticsEvents.filter(e => e.name === 'today_flow_resume').length, 1);
  console.log('PASS registered handoff: existing store unchanged before consent, owned adoption once, original ID/time, persisted receipt, no duplicate completion/resume');
} finally {
  if (root) await act(async () => root.unmount());
  await server.close(); await dom.happyDOM.close();
}
