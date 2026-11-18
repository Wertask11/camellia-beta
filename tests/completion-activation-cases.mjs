import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { Window } from 'happy-dom';
const w = new Window({ url: 'https://camellia.example/' });
Object.assign(globalThis, {
  window: w,
  document: w.document,
  localStorage: w.localStorage,
  location: w.location,
  history: w.history,
});
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  resolve: { alias: { '@': process.cwd() } },
  server: { middlewareMode: true, hmr: false },
});
try {
  const { operatorIntent, armOperatorLogin, clearOperatorLogin } =
    await server.ssrLoadModule('/lib/place/operator-intent.ts');
  assert.equal(
    operatorIntent(
      new URL('https://camellia.example/?open=place-operator'),
      localStorage,
    ),
    true,
  );
  assert.equal(
    operatorIntent(new URL('https://camellia.example/'), localStorage),
    false,
  );
  armOperatorLogin();
  assert.equal(
    operatorIntent(
      new URL(
        'https://camellia.example/?code=synthetic&state=validated-separately',
      ),
      localStorage,
    ),
    true,
  );
  assert.equal(
    operatorIntent(
      new URL('https://camellia.example/?code=synthetic'),
      localStorage,
      Date.now() + 11 * 60000,
    ),
    false,
  );
  clearOperatorLogin();
  assert.equal(
    operatorIntent(
      new URL('https://camellia.example/?code=synthetic'),
      localStorage,
    ),
    false,
  );
  const { requestNotificationPermission } = await server.ssrLoadModule(
    '/lib/notifications/permission.ts',
  );
  let prompts = 0;
  globalThis.Notification = {
    permission: 'default',
    requestPermission: async () => {
      prompts++;
      return 'granted';
    },
  };
  await requestNotificationPermission({
    deliveryReady: false,
    userInitiated: true,
  });
  await requestNotificationPermission({
    deliveryReady: true,
    userInitiated: false,
  });
  assert.equal(prompts, 0);
  await requestNotificationPermission({
    deliveryReady: true,
    userInitiated: true,
  });
  assert.equal(prompts, 1);
  delete globalThis.Notification;
  const { captureReferralRegistration } = await server.ssrLoadModule(
    '/lib/referral/client.ts',
  );
  history.replaceState({}, '', '/?referral=' + 'a'.repeat(43));
  await captureReferralRegistration();
  assert.equal(new URL(location.href).searchParams.has('referral'), false);
  assert.equal(localStorage.getItem('camellia-referral-registration'), null);
  const api = (await server.ssrLoadModule('/api/camellia/referral.ts')).default;
  let code;
  await api(
    { method: 'POST', body: { operation: 'capture', token: 'a'.repeat(43) } },
    {
      setHeader() {},
      status(v) {
        code = v;
        return { json() {} };
      },
    },
  );
  assert.equal(code, 503);
  console.log(
    'PASS fixed-origin operator return hint, expiry/clear, no new OAuth callback, stopped referral capture strips URL without acceptance; public campaign remains stopped. No real login.',
  );
} finally {
  await server.close();
  await w.happyDOM.close();
}
