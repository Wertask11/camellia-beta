import { serverAdmin, adminConfigured } from '../../lib/server/admin.js';
import {
  requireEligibleUser,
  EligibilityError,
} from '../../lib/server/eligibility.js';
import {
  registerPushRecipient,
  saveNotificationSettings,
  stopNotificationSettings,
} from '../../lib/notifications/delivery.js';
import { allowedPushEndpoint, vapidConfig, vapidProblem } from '../../lib/notifications/webpush.js';
import { SERVER_ROOT } from '../../lib/server/admin.js';
/** Delivery starts only with VAPID keys in Vercel AND the operator's approved config/notification_delivery. */
async function deliveryStatus(db: ReturnType<typeof serverAdmin>['db']) {
  const vapid = vapidConfig();
  if (!vapid) {
    console.warn('camellia_notification_not_ready', { reason: vapidProblem() ?? 'vapid_config' });
    return { deliveryReady: false as const };
  }
  const cfg = (await db.doc(`${SERVER_ROOT}/config/notification_delivery`).get()).data();
  if (cfg?.approved === true && cfg.enabled === true)
    return { deliveryReady: true as const, vapidPublicKey: vapid.publicKey };
  console.warn('camellia_notification_not_ready', { reason: 'operator_config' });
  return { deliveryReady: false as const };
}
type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type Res = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (v: unknown) => void };
};
/** Preferences, plus this device's push endpoint once the owner explicitly allows notifications. */
export default async function notificationSettings(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!adminConfigured())
    return res.status(503).json({ error: 'SETTINGS_UNAVAILABLE' });
  try {
    const deps = serverAdmin(),
      header = req.headers.authorization,
      token =
        typeof header === 'string' && header.startsWith('Bearer ')
          ? header.slice(7)
          : '';
    if (req.method === 'DELETE') {
      const owner = await deps.auth.verifyIdToken(token, true);
      if (owner.firebase?.sign_in_provider === 'anonymous'||owner.firebase?.sign_in_provider==='password'&&owner.email_verified!==true)
        return res.status(401).json({ error: 'LOGIN_REQUIRED' });
      return res
        .status(200)
        .json(await stopNotificationSettings(deps.db, owner.uid));
    }
    const user = await requireEligibleUser(token, deps);
    if (req.method === 'GET') {
      const row = await deps.db
        .doc(`camellia_users/${user.uid}/profile/notification_preferences`)
        .get();
      return res
        .status(200)
        .json({ revision: row.data()?.revision ?? 0, ...(await deliveryStatus(deps.db)) });
    }
    const body =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};
    if (req.method === 'POST' && body.operation === 'register') {
      if (!(await deliveryStatus(deps.db)).deliveryReady)
        return res.status(503).json({ error: 'DELIVERY_NOT_READY' });
      if (Object.keys(body).some((k) => !['operation', 'endpoint'].includes(k)) || !allowedPushEndpoint(body.endpoint))
        return res.status(400).json({ error: 'INVALID_SUBSCRIPTION' });
      await registerPushRecipient(deps.db, user.uid, body.endpoint);
      return res.status(200).json({ registered: true });
    }
    if (
      req.method !== 'POST' ||
      Buffer.byteLength(JSON.stringify(body)) > 1000 ||
      Object.keys(body).some(
        (k) => !['preferences', 'expectedRevision'].includes(k),
      ) ||
      !Number.isSafeInteger(body.expectedRevision) ||
      Number(body.expectedRevision) < 0
    )
      return res.status(400).json({ error: 'INVALID_PREFERENCES' });
    return res
      .status(200)
      .json(
        await saveNotificationSettings(
          deps.db,
          user.uid,
          body.preferences,
          Number(body.expectedRevision),
        ),
      );
  } catch (e) {
    console.warn('camellia_notification_settings_failed', {
      reason: e instanceof EligibilityError ? e.code : e instanceof Error ? e.message.slice(0, 60) : 'unknown',
    });
    if (e instanceof EligibilityError)
      return res.status(e.status).json({ error: e.code });
    return res
      .status(
        e instanceof Error && e.message === 'PREFERENCES_CHANGED' ? 409 : 503,
      )
      .json({ error: 'SETTINGS_UNAVAILABLE' });
  }
}
