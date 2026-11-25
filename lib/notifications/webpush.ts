import { createPrivateKey, sign } from 'node:crypto';
import type { DeliveryDriver } from './delivery.js';

/**
 * Web Push without a payload: the service worker always shows the same generic text
 * (safeNotificationPreview), so nothing personal ever leaves the server and no payload encryption is needed.
 * Only VAPID (RFC 8292) signing is required.
 */
export type VapidConfig = { publicKey: string; privateKey: string; subject: string };
const b64u = (buf: Buffer) => buf.toString('base64url');
export function vapidConfig(env: Record<string, string | undefined> = process.env): VapidConfig | undefined {
  const publicKey = env.VAPID_PUBLIC_KEY ?? '', privateKey = env.VAPID_PRIVATE_KEY ?? '', subject = env.VAPID_SUBJECT ?? '';
  if (env.CAMELLIA_NOTIFICATIONS_ENABLED !== 'true') return undefined;
  try {
    const pub = Buffer.from(publicKey, 'base64url'), priv = Buffer.from(privateKey, 'base64url');
    if (pub.length !== 65 || pub[0] !== 4 || priv.length !== 32) return undefined;
  } catch {
    return undefined;
  }
  if (!/^(mailto:[^\s@]+@[^\s@]+|https:\/\/\S+)$/.test(subject)) return undefined;
  return { publicKey, privateKey, subject };
}
/** Push services browsers actually use. Anything else is refused so a stored endpoint cannot redirect our requests. */
export function allowedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && !url.username && !url.password && (url.port === '' || url.port === '443') &&
      /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/.test(url.hostname);
  } catch {
    return false;
  }
}
export function vapidJwt(config: VapidConfig, audience: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const pub = Buffer.from(config.publicKey, 'base64url');
  const key = createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: config.privateKey, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: 'jwk',
  });
  const header = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud: audience, exp: nowSeconds + 12 * 3600, sub: config.subject })));
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${header}.${claims}.${b64u(signature)}`;
}
export function createWebPushDriver(config: VapidConfig, fetcher: typeof fetch = fetch): DeliveryDriver {
  return {
    idempotent: true,
    async send({ recipient }) {
      if (!allowedPushEndpoint(recipient)) return 'rejected';
      const url = new URL(recipient);
      const response = await fetcher(recipient, {
        method: 'POST',
        headers: { TTL: '86400', Urgency: 'normal', 'Content-Length': '0', Authorization: `vapid t=${vapidJwt(config, url.origin)}, k=${config.publicKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (response.status >= 200 && response.status < 300) return 'delivered';
      // 404/410: the browser unsubscribed. Treat as a definite rejection so the registration is removed.
      if (response.status === 404 || response.status === 410) return 'rejected';
      return 'unknown';
    },
  };
}
