import { timingSafeEqual } from 'node:crypto';
import { serverAdmin, adminConfigured } from '../../lib/server/admin.js';
import { deliverDueNotifications } from '../../lib/notifications/delivery.js';
import { createWebPushDriver, vapidConfig } from '../../lib/notifications/webpush.js';
type Req = { headers: Record<string, string | string[] | undefined> };
type Res = { setHeader: (n: string, v: string) => void; status: (c: number) => { json: (v: unknown) => void } };
/** Vercel Cron (vercel.json) calls this once a day with Authorization: Bearer CRON_SECRET. */
export default async function notificationCron(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET ?? '', header = req.headers.authorization;
  const expected = Buffer.from(`Bearer ${secret}`), given = Buffer.from(typeof header === 'string' ? header : '');
  if (secret.length < 16 || expected.length !== given.length || !timingSafeEqual(expected, given)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const vapid = vapidConfig();
  if (!vapid || !adminConfigured()) return res.status(200).json({ skipped: 'not_configured' });
  const { db } = serverAdmin();
  const counts = await deliverDueNotifications(db, createWebPushDriver(vapid));
  console.log('camellia_notification_cron', counts);
  return res.status(200).json(counts);
}
