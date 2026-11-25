import assert from 'node:assert/strict';
import { createPublicKey, verify, generateKeyPairSync } from 'node:crypto';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, root: process.cwd(), resolve: { alias: { '@': process.cwd() } }, server: { middlewareMode: true, hmr: false } });
try {
  const { vapidConfig, vapidJwt, allowedPushEndpoint, createWebPushDriver } = await server.ssrLoadModule('/lib/notifications/webpush.ts');
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pub = publicKey.export({ format: 'jwk' }), d = privateKey.export({ format: 'jwk' }).d;
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]).toString('base64url');
  const env = { CAMELLIA_NOTIFICATIONS_ENABLED: 'true', VAPID_PUBLIC_KEY: raw, VAPID_PRIVATE_KEY: d, VAPID_SUBJECT: 'mailto:ops@example.com' };
  assert.equal(vapidConfig({}), undefined, 'off by default');
  assert.equal(vapidConfig({ ...env, CAMELLIA_NOTIFICATIONS_ENABLED: 'false' }), undefined);
  assert.equal(vapidConfig({ ...env, VAPID_PUBLIC_KEY: 'short' }), undefined);
  assert.equal(vapidConfig({ ...env, VAPID_SUBJECT: 'nobody' }), undefined);
  const config = vapidConfig(env);
  const jwt = vapidJwt(config, 'https://fcm.googleapis.com', 1_800_000_000);
  const [h, c, s] = jwt.split('.');
  assert.ok(verify('sha256', Buffer.from(`${h}.${c}`), { key: createPublicKey({ key: pub, format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')), 'ES256 signature verifies with the public key');
  assert.deepEqual(JSON.parse(Buffer.from(c, 'base64url')), { aud: 'https://fcm.googleapis.com', exp: 1_800_000_000 + 43200, sub: 'mailto:ops@example.com' });
  for (const ok of ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://web.push.apple.com/Qabc', 'https://wns2-par02p.notify.windows.com/w/?token=x']) assert.ok(allowedPushEndpoint(ok), ok);
  for (const bad of ['http://fcm.googleapis.com/x', 'https://evil.example/fcm.googleapis.com', 'https://fcm.googleapis.com.evil.example/x', 'https://user:pw@fcm.googleapis.com/x', 'https://localhost/x', 42]) assert.ok(!allowedPushEndpoint(bad), String(bad));
  const calls = [];
  const fake = (status) => async (url, init) => (calls.push({ url, init }), { status });
  assert.equal(await createWebPushDriver(config, fake(201)).send({ key: 'k', recipient: 'https://fcm.googleapis.com/fcm/send/abc', payload: {} }), 'delivered');
  assert.match(calls[0].init.headers.Authorization, /^vapid t=[^,]+, k=/); assert.equal(calls[0].init.body, undefined, 'no payload is sent');
  assert.equal(await createWebPushDriver(config, fake(410)).send({ key: 'k', recipient: 'https://fcm.googleapis.com/fcm/send/abc', payload: {} }), 'rejected');
  assert.equal(await createWebPushDriver(config, fake(500)).send({ key: 'k', recipient: 'https://fcm.googleapis.com/fcm/send/abc', payload: {} }), 'unknown');
  assert.equal(await createWebPushDriver(config, fake(201)).send({ key: 'k', recipient: 'https://evil.example/x', payload: {} }), 'rejected', 'stored non-push endpoints are never called');
  console.log('PASS Web Push: off unless configured, valid ES256 VAPID JWT, push-service allowlist, no payload, delivered/rejected/unknown mapping. No real push sent.');
} finally {
  await server.close();
}
