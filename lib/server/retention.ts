import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { SERVER_ROOT } from './admin.js';
/** Fixed operational collections only. Never a user-supplied Firestore path or personal archive. */
export const EXPIRY_COLLECTIONS = [
  'rate_windows',
  'partner_rate_windows',
  'place_rate_windows',
  'referral_rate_windows',
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
    const policy = (
      await tx.get(db.doc(`${SERVER_ROOT}/config/retention`))
    ).data()?.collections?.[collection];
    if (
      policy?.approved !== true ||
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
      eligible = records.docs.filter(
        (d) =>
          Number.isFinite(millis(d.data().createdAt)) &&
          millis(d.data().createdAt) + policy.retentionMs <= now,
      ),
      digest = createHash('sha256')
        .update(
          JSON.stringify({
            collection,
            policy,
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
    for (const d of eligible) tx.delete(d.ref);
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
