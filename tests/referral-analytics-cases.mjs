import assert from 'node:assert/strict';
import { createServer } from 'vite';
const calls = [],
  records = new Map(),
  auth = { currentUser: null, authStateReady: async () => {} };
globalThis[Symbol.for('referral-analytics-test')] = { auth, calls };
const globals = {
  fetch: globalThis.fetch,
  location: globalThis.location,
  history: globalThis.history,
  localStorage: globalThis.localStorage,
};
globalThis.localStorage = {
  getItem: (k) => records.get(k) ?? null,
  setItem: (k, v) => records.set(k, v),
  removeItem: (k) => records.delete(k),
};
const token = 'Q'.repeat(43),
  intent = 'R'.repeat(43),
  key = 'camellia-referral-registration';
globalThis.location = { href: 'https://example.test/?referral=' + token };
globalThis.history = { replaceState() {} };
globalThis.fetch = async () =>
  new Response(
    JSON.stringify({
      intent,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    }),
    { status: 200 },
  );
const vite = await createServer({
  configFile: false,
  root: process.cwd(),
  resolve: { alias: { '@': process.cwd() } },
  server: { middlewareMode: true, hmr: false },
  plugins: [
    {
      name: 'referral-analytics-only',
      enforce: 'pre',
      resolveId(id) {
        if (id.includes('schoolpark/firebase')) return '\0referral-auth';
        if (
          id.includes('analytics/posthog') &&
          !id.startsWith('/lib/analytics/')
        )
          return '\0referral-analytics';
      },
      load(id) {
        if (id === '\0referral-auth')
          return 'export const schoolParkAuth=globalThis[Symbol.for("referral-analytics-test")].auth;';
        if (id === '\0referral-analytics')
          return 'export const captureReferralGrant=id=>{globalThis[Symbol.for("referral-analytics-test")].calls.push(id);return true;};';
      },
    },
  ],
});
try {
  const client = await vite.ssrLoadModule('/lib/referral/client.ts');
  await client.captureReferralRegistration();
  const pending = JSON.parse(records.get(key));
  assert.match(pending.analyticsId, /^[a-f0-9-]{36}$/i);
  auth.currentUser = {
    uid: 'LOCAL-A',
    isAnonymous: false,
    getIdToken: async () => 'LOCAL-ONLY',
  };
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  await client.completePendingReferral('LOCAL-A');
  assert.equal(calls.length, 0);
  assert.ok(records.has(key));
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ granted: true, reused: true }), {
      status: 200,
    });
  await client.completePendingReferral('LOCAL-A');
  assert.deepEqual(calls, [pending.analyticsId]);
  assert.equal(records.has(key), false);
  records.set(key, JSON.stringify({ ...pending, uid: 'LOCAL-A' }));
  await client.completePendingReferral('LOCAL-A');
  assert.deepEqual(
    calls,
    [pending.analyticsId, pending.analyticsId],
    'same insert ID across successful reply retry',
  );
  records.set(key, JSON.stringify({ ...pending, uid: 'LOCAL-A' }));
  globalThis.fetch = async () => {
    auth.currentUser = { uid: 'LOCAL-B', isAnonymous: false };
    return new Response(JSON.stringify({ granted: true }), { status: 200 });
  };
  await client.completePendingReferral('LOCAL-A');
  assert.equal(calls.length, 2, 'account switch must not attribute A to B');
  // Load real sanitizer separately; malicious identifiers/content cannot cross the allowlist.
  const analytics = await vite.ssrLoadModule('/lib/analytics/posthog.ts');
  const state = {
    profile: { id: 'LOCAL ANALYTICS PROFILE' },
    analyticsEvents: [],
  };
  for (const name of [
    'referral_view',
    'referral_link_created',
    'referral_link_revoked',
    'referral_link_shared',
    'referral_trial_granted',
    'tree_decoration_claimed',
    'tree_decoration_equipped',
  ]) {
    const safe = analytics.sanitizeEventProperties(
        {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          properties: {
            share_method: 'copy',
            uid: 'PRIVATE UID',
            email: 'PRIVATE MAIL',
            token,
            recipient: 'PRIVATE RECIPIENT',
            message: 'PRIVATE MESSAGE',
            decorationId: 'PRIVATE DESIGN',
          },
        },
        state,
      ),
      serialized = JSON.stringify(safe);
    for (const forbidden of ['PRIVATE', token, 'recipient', 'decorationId'])
      assert.ok(!serialized.includes(forbidden));
    if (name === 'referral_link_shared')
      assert.equal(safe.share_method, 'copy');
    else assert.ok(!('share_method' in safe));
  }
  console.log(
    'PASS referral analytics stable random insert ID, failed response does not grant event, successful retry dedup key, account switch rejection, all referral/decoration event property allowlists. SDK delivery/provider/Auth are fixtures.',
  );
} finally {
  await vite.close();
  for (const [k, v] of Object.entries(globals))
    if (v === undefined) delete globalThis[k];
    else globalThis[k] = v;
  delete globalThis[Symbol.for('referral-analytics-test')];
}
