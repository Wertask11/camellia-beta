import assert from 'node:assert/strict';
import { createServer } from 'vite';
const keys = [
  'CAMELLIA_CIRCLE_ENABLED',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'CAMELLIA_CIRCLE_SIGNING_SECRET',
];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  resolve: { alias: { '@': process.cwd() } },
  server: { middlewareMode: true, hmr: false },
});
try {
  const { default: circle } = await server.ssrLoadModule(
    '/api/camellia/circle.ts',
  );
  for (const [values, expected] of [
    [{}, 'disabled'],
    [{ CAMELLIA_CIRCLE_ENABLED: 'true' }, 'storage_not_configured'],
    [
      { CAMELLIA_CIRCLE_ENABLED: 'true', FIREBASE_SERVICE_ACCOUNT_JSON: '{}' },
      'signing_not_configured',
    ],
    [
      {
        CAMELLIA_CIRCLE_ENABLED: 'true',
        FIREBASE_SERVICE_ACCOUNT_JSON: '{}',
        CAMELLIA_CIRCLE_SIGNING_SECRET: 'x'.repeat(32),
      },
      'ready',
    ],
  ]) {
    for (const key of keys) delete process.env[key];
    Object.assign(process.env, values);
    let code, body;
    const headers = {};
    const res = {
      setHeader: (key, value) => {
        headers[key] = value;
      },
      status: (value) => {
        code = value;
        return {
          json: (value) => {
            body = value;
          },
        };
      },
    };
    await circle({ method: 'GET', headers: {}, query: { status: '1' } }, res);
    assert.equal(code, 200);
    assert.deepEqual(body, {
      enabled: expected === 'ready',
      configurationStatus: expected,
      ...(expected === 'ready' ? { storageStatus: 'wrong_project' } : {}),
    });
    assert.equal(headers['Cache-Control'], 'no-store');
    assert.equal(
      Object.keys(body).length,
      expected === 'ready' ? 3 : 2,
      'no credential values or private identity',
    );
    await circle({ method: 'POST', headers: {}, body: {} }, res);
    assert.equal(
      code,
      expected === 'ready' ? 401 : 503,
      'configuration never grants anonymous write access',
    );
  }
  console.log(
    'Circle configuration status and anonymous access PASS (unit-only placeholder env; no live credentials, auth or storage).',
  );
} finally {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  await server.close();
}
