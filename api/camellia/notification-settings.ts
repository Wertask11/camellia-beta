import { serverAdmin, adminConfigured } from '../../lib/server/admin.js';
import {
  requireEligibleUser,
  EligibilityError,
} from '../../lib/server/eligibility.js';
import {
  saveNotificationSettings,
  stopNotificationSettings,
} from '../../lib/notifications/delivery.js';
type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type Res = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (v: unknown) => void };
};
/** Preferences only. No push subscription, permission prompt, driver or send endpoint. */
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
      if (owner.firebase?.sign_in_provider === 'anonymous')
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
        .json({ revision: row.data()?.revision ?? 0, deliveryReady: false });
    }
    const body =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};
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
    if (e instanceof EligibilityError)
      return res.status(e.status).json({ error: e.code });
    return res
      .status(
        e instanceof Error && e.message === 'PREFERENCES_CHANGED' ? 409 : 503,
      )
      .json({ error: 'SETTINGS_UNAVAILABLE' });
  }
}
