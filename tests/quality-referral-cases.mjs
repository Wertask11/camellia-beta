import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  resolve: { alias: { '@': process.cwd() } },
  server: { middlewareMode: true, hmr: false },
});
try {
  const { referralConfiguration } =
    await server.ssrLoadModule('/lib/referral/config.ts');
  const {referralDeploymentReady}=await server.ssrLoadModule('/lib/referral/readiness.ts');
  assert.equal(referralDeploymentReady({}),false);
  assert.equal(referralDeploymentReady({CAMELLIA_REFERRAL_ENABLED:'true'}),false);
  const none = referralConfiguration({});
  assert.ok(
    none.missing.includes('monthlyBudgetYen') &&
      none.missing.includes('trialAiRequests') &&
      none.missing.includes('newcomerAfterCap'),
  );
  const handler = (await server.ssrLoadModule('/api/camellia/referral.ts'))
    .default;
  for (const method of ['GET', 'POST']) {
    let status, body;
    await handler(
      { method, body: { operation: 'grant', uid: 'FORGED' } },
      {
        setHeader() {},
        status(code) {
          status = code;
          return {
            json(v) {
              body = v;
            },
          };
        },
      },
    );
    assert.equal(status, method === 'GET' ? 200 : 503);
    if (method === 'GET') assert.equal(body.enabled, false);
  }
  console.log(
    'PASS missing business decisions have no defaults; public campaign stopped and no issuance/grant route.',
  );
} finally {
  await server.close();
}
