import {
  requestReceiptClosed,
  providerUsageClosed,
} from './retention-safety.js';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { SERVER_ROOT } from './admin.js';
/** Fixed operational collections only. Never a user-supplied Firestore path or personal archive. */
export const EXPIRY_COLLECTIONS = [
  'free_chat_days',
  'member_free_chat_days',
  'billing_rate_windows',
  'billing_analytics_outbox',
  'notification_rate_windows',
  'place_application_rate_windows',
  'place_applications',
  'place_application_audit',
  'notification_deliveries',
  'notification_push_attempts',
  'rate_windows',
  'partner_rate_windows',
  'place_rate_windows',
  'referral_rate_windows',
  'referral_intents',
  'place_metric_receipts',
  'ai_usage_receipts',
  'ai_request_receipts',
  'partner_shares',
] as const;
const millis = (v: unknown) =>
  v instanceof Date
    ? v.getTime()
    : typeof v === 'string'
      ? Date.parse(v)
      : v &&
          typeof v === 'object' &&
          'toMillis' in v &&
          typeof v.toMillis === 'function'
        ? v.toMillis()
        : NaN;
export async function expiryCleanup(
  db: Firestore,
  collection: string,
  options: {
    apply?: boolean;
    approvedDigest?: string;
    now?: number;
    after?: { expiresAt: string; id: string };
  } = {},
) {
  if (!(EXPIRY_COLLECTIONS as readonly string[]).includes(collection))
    throw new Error('RETENTION_COLLECTION_NOT_ALLOWED');
  if (
    options.after &&
    (!Number.isFinite(Date.parse(options.after.expiresAt)) ||
      !/^[-a-zA-Z0-9_]{1,200}$/.test(options.after.id))
  )
    throw new Error('INVALID_RETENTION_CURSOR');
  return db.runTransaction(async (tx) => {
    const config = await tx.get(db.doc(`${SERVER_ROOT}/config/retention`));
    if (config.data()?.paused === true) throw new Error('RETENTION_PAUSED');
    const policy = config.data()?.collections?.[collection];
    if (
      policy?.approved !== true ||
      (collection === 'place_applications' && policy.mode !== 'closed_only') ||
      !Number.isSafeInteger(policy.retentionMs) ||
      policy.retentionMs <= 0 ||
      typeof policy.approvedBy !== 'string' ||
      !policy.approvedBy ||
      typeof policy.approvedAt !== 'string' ||
      !Number.isFinite(Date.parse(policy.approvedAt))
    )
      throw new Error('RETENTION_NOT_APPROVED');
    const now = options.now ?? Date.now(),
      asExpiry = (v: string) =>
        collection === 'partner_shares' ? v : new Date(v);
    let query = db
      .collection(`${SERVER_ROOT}/${collection}`)
      .where('expiresAt', '<=', asExpiry(new Date(now).toISOString()))
      .orderBy('expiresAt')
      .orderBy(FieldPath.documentId())
      .limit(100);
    if (options.after)
      query = query.startAfter(
        asExpiry(options.after.expiresAt),
        options.after.id,
      );
    const records = await tx.get(query),
      eligible = [],
      dependencies: unknown[] = [];
    for (const d of records.docs) {
      const v = d.data(),
        hold = await tx.get(
          db.doc(
            `${SERVER_ROOT}/retention_holds/${createHash('sha256').update(d.ref.path).digest('hex')}`,
          ),
        );
      dependencies.push([
        hold.ref.path,
        hold.updateTime?.seconds ?? null,
        hold.updateTime?.nanoseconds ?? null,
      ]);
      let safe =
        v.legalHold !== true && (!hold.exists || hold.data()?.active === false);
      // A lease expiring does not prove the provider did not run or bill a request.
      if (collection === 'ai_request_receipts' && !requestReceiptClosed(v))
        safe = false;
      if (collection === 'ai_usage_receipts' && !providerUsageClosed(v))
        safe = false;
      if (collection === 'place_application_audit') {
        if (
          typeof v.applicationId !== 'string' ||
          !/^[-a-zA-Z0-9_]{1,200}$/.test(v.applicationId)
        )
          safe = false;
        else {
          const app = await tx.get(
            db.doc(`${SERVER_ROOT}/place_applications/${v.applicationId}`),
          );
          dependencies.push([
            app.ref.path,
            app.updateTime?.seconds ?? null,
            app.updateTime?.nanoseconds ?? null,
          ]);
          if (
            !app.exists ||
            !['declined', 'withdrawn', 'archived'].includes(
              app.data()?.status,
            ) ||
            app.data()?.scopeGranted === true ||
            !Number.isFinite(millis(app.data()?.closedAt)) ||
            millis(app.data()?.closedAt) + policy.retentionMs > now
          )
            safe = false;
        }
      }
      if (
        safe &&
        Number.isFinite(millis(v.createdAt)) &&
        millis(collection === 'place_applications' ? v.closedAt : v.createdAt) +
          policy.retentionMs <=
          now &&
        (collection !== 'place_applications' ||
          (['declined', 'withdrawn', 'archived'].includes(v.status) &&
            v.scopeGranted !== true))
      )
        eligible.push(d);
    }
    const digest = createHash('sha256')
      .update(
        JSON.stringify({
          collection,
          policy,
          configVersion: [
            config.updateTime?.seconds,
            config.updateTime?.nanoseconds,
          ],
          dependencies,
          records: eligible.map((d) => [
            d.id,
            d.updateTime.seconds,
            d.updateTime.nanoseconds,
          ]),
        }),
      )
      .digest('hex');
    const last = records.docs.at(-1),
      nextCursor =
        records.size === 100 && last
          ? {
              id: last.id,
              expiresAt: new Date(millis(last.data().expiresAt)).toISOString(),
            }
          : undefined;
    if (!options.apply)
      return {
        apply: false,
        digest,
        eligible: eligible.length,
        held: records.size - eligible.length,
        hasMore: records.size === 100,
        nextCursor,
      };
    if (options.approvedDigest !== digest)
      throw new Error('RETENTION_PLAN_CHANGED');
    for (const d of eligible) {
      tx.delete(d.ref);
      if (
        collection === 'partner_shares' &&
        typeof d.data().ownerUid === 'string' &&
        /^[^/]{1,128}$/.test(d.data().ownerUid)
      )
        tx.delete(
          db.doc(`camellia_users/${d.data().ownerUid}/partner_shares/${d.id}`),
        );
    }
    if (eligible.length)
      tx.set(db.doc(`${SERVER_ROOT}/retention_audit/${digest}`), {
        collection,
        count: eligible.length,
        digest,
        at: new Date(now).toISOString(),
      });
    return { apply: true, deleted: eligible.length, digest, nextCursor };
  });
}
