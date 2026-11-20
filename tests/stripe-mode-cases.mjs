import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true, hmr: false },
  }),
  before = process.env.VERCEL_ENV;
try {
  const scope = await vite.ssrLoadModule('/lib/billing/scope.ts'),
    { stripeSettings, stripeAdapter } = await vite.ssrLoadModule(
      '/lib/billing/stripe.ts',
    ),
    { membershipFromResponse } = await vite.ssrLoadModule(
      '/lib/membership/model.ts',
    );
  for (const name of ['billing', 'retention', 'ai_observation'])
    assert.notEqual(
      scope.billingConfigPath(name, 'test'),
      scope.billingConfigPath(name, 'live'),
    );
  assert.notEqual(
    scope.billingEntitlementPath('LOCAL', 'test'),
    scope.billingEntitlementPath('LOCAL', 'live'),
  );
  assert.equal(
    scope.billingEntitlementPath('LOCAL'),
    'camellia_users/LOCAL/admin/billing_subscription',
  );
  for (const value of ['production', undefined, 'development']) {
    if (value === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = value;
    assert.equal(scope.billingReadMode(), 'live');
  }
  process.env.VERCEL_ENV = 'preview';
  assert.equal(scope.billingReadMode(), 'test');
  assert.equal(
    stripeSettings({
      VERCEL_ENV: 'production',
      CAMELLIA_STRIPE_ENABLED: 'true',
      CAMELLIA_BILLING_MODE: 'test',
      STRIPE_SECRET_KEY: 'sk_test_LOCAL',
      STRIPE_WEBHOOK_SECRET: 'whsec_LOCAL',
    }),
    undefined,
  );
  assert.equal(
    stripeAdapter({}, { mode: 'test', secret: 'LOCAL', priceId: 'LOCAL' }).mode,
    'test',
  );
  const safe = membershipFromResponse({
    plan: 'plus',
    paid: true,
    trial: false,
    billingMode: 'test',
    priceYen: 500,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(safe.billingMode, 'test');
  assert.equal(
    membershipFromResponse({
      plan: 'free',
      paid: false,
      trial: false,
      billingMode: 'test',
      priceYen: 500,
    }).billingMode,
    undefined,
  );
  console.log(
    'PASS immutable live path compatibility, isolated sandbox paths/configs, deployment-derived read mode, Production test-key rejection, adapter mode and explicit sandbox UI status. No provider calls.',
  );
} finally {
  if (before === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = before;
  await vite.close();
}
