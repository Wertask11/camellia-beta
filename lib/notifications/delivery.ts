import { createHash, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import {
  safeNotificationPreview,
  validNotificationPreferences,
  type NotificationPreferences,
} from './preferences.js';
export type DeliveryDriver = {
  idempotent: true;
  send: (request: {
    key: string;
    recipient: string;
    payload: ReturnType<typeof safeNotificationPreview>;
  }) => Promise<'delivered' | 'rejected' | 'unknown'>;
};
export function notificationPeriod(
  frequency: NotificationPreferences['frequency'],
  now: number,
) {
  const date = new Date(now + 9 * 3600000);
  if (frequency === 'monthly') return date.toISOString().slice(0, 7);
  if (frequency === 'weekly') {
    const day = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - day);
  }
  return date.toISOString().slice(0, 10);
}
export async function saveNotificationSettings(
  db: Firestore,
  uid: string,
  prefs: unknown,
  expectedRevision: number | null,
) {
  if (!validNotificationPreferences(prefs))
    throw new Error('INVALID_PREFERENCES');
  const ref = db.doc(`camellia_users/${uid}/profile/notification_preferences`);
  return db.runTransaction(async (tx) => {
    const [root, old] = await Promise.all([
      tx.get(db.doc(`camellia_users/${uid}`)),
      tx.get(ref),
    ]);
    if (!root.exists || root.data()?.personalDeleteInProgress)
      throw new Error('ACCOUNT_UNAVAILABLE');
    const revision = Number(old.data()?.revision ?? 0);
    if (expectedRevision !== null && expectedRevision !== revision)
      throw new Error('PREFERENCES_CHANGED');
    tx.set(ref, {
      preferences: prefs,
      revision: revision + 1,
      updatedAt: new Date().toISOString(),
    });
    return { revision: revision + 1, deliveryReady: false };
  });
}
/** No driver is configured in production. A job must re-check consent before EVERY delivery/retry. */
export class NotificationDelivery {
  constructor(
    private db: Firestore,
    private driver?: DeliveryDriver,
    private now = Date.now,
  ) {}
  async send(uid: string, topic: NotificationPreferences['topics'][number]) {
    if (!this.driver?.idempotent) return { state: 'not_configured' };
    const settings = this.db.doc(
        `camellia_users/${uid}/profile/notification_preferences`,
      ),
      config = this.db.doc(`${SERVER_ROOT}/config/notification_delivery`),
      registration = this.db.doc(
        `camellia_users/${uid}/admin/notification_registration`,
      ),
      root = this.db.doc(`camellia_users/${uid}`),
      now = this.now(),
      attempt = randomUUID();
    const claim = await this.db.runTransaction(async (tx) => {
      const [c, s, r, account] = await Promise.all([
          tx.get(config),
          tx.get(settings),
          tx.get(registration),
          tx.get(root),
        ]),
        prefs = s.data()?.preferences;
      if (
        c.data()?.approved !== true ||
        c.data()?.enabled !== true ||
        !account.exists ||
        account.data()?.personalDeleteInProgress ||
        !validNotificationPreferences(prefs) ||
        !prefs.requested ||
        !prefs.topics.includes(topic) ||
        r.data()?.permission !== 'granted' ||
        typeof r.data()?.recipient !== 'string'
      )
        return;
      const id = createHash('sha256')
          .update(
            `${uid}:${prefs.frequency}:${notificationPeriod(prefs.frequency, now)}`,
          )
          .digest('hex'),
        ref = this.db.doc(`${SERVER_ROOT}/notification_deliveries/${id}`),
        old = await tx.get(ref),
        v = old.data();
      if (v && v.state !== 'rejected') return;
      // An explicit rejected result permits a controlled retry; unknown/dispatching never does.
      tx.set(ref, {
        owner: createHash('sha256').update(uid).digest('hex'),
        state: 'dispatching',
        settingsRevision: s.data()!.revision,
        attempt,
        createdAt: v?.createdAt ?? new Date(now),
        updatedAt: new Date(now),
      });
      return {
        ref,
        key: id,
        revision: s.data()!.revision,
        recipient: r.data()!.recipient as string,
      };
    });
    if (!claim) return { state: 'stopped_or_duplicate' };
    // Stop/frequency/topic changes between reservation and dispatch cancel the queued operation.
    const [latest, account, cfg, reg] = await Promise.all([
      settings.get(),
      root.get(),
      config.get(),
      registration.get(),
    ]);
    if (
      latest.data()?.revision !== claim.revision ||
      !latest.data()?.preferences?.requested ||
      !account.exists ||
      account.data()?.personalDeleteInProgress ||
      cfg.data()?.enabled !== true ||
      cfg.data()?.approved !== true ||
      reg.data()?.permission !== 'granted' ||
      reg.data()?.recipient !== claim.recipient
    ) {
      await claim.ref.update({ state: 'cancelled' });
      return { state: 'cancelled' };
    }
    let state: 'delivered' | 'rejected' | 'unknown' = 'unknown';
    try {
      const result = await this.driver.send({
        key: claim.key,
        recipient: claim.recipient,
        payload: safeNotificationPreview(),
      });
      state = ['delivered', 'rejected', 'unknown'].includes(result)
        ? result
        : 'unknown';
    } catch {
      /* Ambiguous provider result: retain the claim; never duplicate by blind retry. */
    }
    await claim.ref.update({ state, finishedAt: new Date(this.now()) });
    return { state };
  }
}

/** Owner can stop during suspension/deletion too. No outbound provider call is required to stop our dispatcher. */
export async function stopNotificationSettings(db: Firestore, uid: string) {
  const settings = db.doc(
      `camellia_users/${uid}/profile/notification_preferences`,
    ),
    registration = db.doc(
      `camellia_users/${uid}/admin/notification_registration`,
    );
  await db.runTransaction(async (tx) => {
    const old = await tx.get(settings);
    tx.delete(registration);
    if (old.exists) {
      const v = old.data()!,
        prefs = v.preferences;
      tx.set(settings, {
        preferences: {
          requested: false,
          topics: [],
          frequency: validNotificationPreferences(prefs)
            ? prefs.frequency
            : 'weekly',
          updatedAt: new Date().toISOString(),
        },
        revision: Number(v.revision ?? 0) + 1,
      });
    }
  });
  return { stopped: true };
}
