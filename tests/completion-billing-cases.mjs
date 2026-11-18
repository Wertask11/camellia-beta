import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  server: { middlewareMode: true, hmr: false },
});
try {
  const { createBillingWebhook } = await server.ssrLoadModule(
      '/lib/billing/webhook.ts',
    ),
    h = createBillingWebhook({
      dependencies: () => {
        throw new Error('must not initialize storage');
      },
    });
  assert.equal((await h(new Uint8Array(), 'forged')).status, 503);
  const bad = createBillingWebhook({
    adapter: {
      id: 'local-test',
      verify: async () => {
        throw new Error('bad signature');
      },
    },
    dependencies: () => {
      throw new Error('must not initialize storage');
    },
  });
  assert.equal((await bad(new Uint8Array(), 'forged')).status, 400);
  const endpoint = (
    await server.ssrLoadModule('/api/camellia/billing-webhook.ts')
  ).default;
  let status;
  endpoint(
    { body: { paid: true, uid: 'FORGED' } },
    {
      setHeader() {},
      status(v) {
        status = v;
        return { json() {} };
      },
    },
  );
  assert.equal(status, 503);
  console.log(
    'PASS unconfigured checkout/payment webhook fails closed; forged signature never touches storage or creates Plus. No processor or payment simulated as real.',
  );
} finally {
  await server.close();
}
