import { createHash } from 'node:crypto';
import {
  FieldPath,
  type Firestore,
  type DocumentSnapshot,
} from 'firebase-admin/firestore';
import { SERVER_ROOT } from './admin.js';

const definitions = {
  referral_codes: { mode: 'revoked_only', time: 'createdAt' },
  referral_ai_reservations: { mode: 'settled_trial', time: 'createdAt' },
  referral_identities: { mode: 'closed_identity_window', time: 'createdAt' },
  referral_grants: { mode: 'reconciled_trial', time: 'expiresAt' },
  referral_rewards: { mode: 'closed_month', time: 'period' },
  referral_budgets: { mode: 'closed_budget', time: 'period' },
  referral_audit: { mode: 'closed_campaign', time: 'at' },
  referral_budget_audit: { mode: 'closed_campaign', time: 'at' },
  circle_posts: { mode: 'removed_content', time: 'updatedAt' },
  circle_comments: { mode: 'removed_content', time: 'updatedAt' },
  circle_reports: { mode: 'resolved_case', time: 'resolvedAt' },
  circle_moderation_audit: { mode: 'resolved_case', time: 'createdAt' },
  circle_reactions: { mode: 'removed_parent', time: 'updatedAt' },
  place_audit: { mode: 'closed_place', time: 'createdAt' },
  place_agreements: { mode: 'closed_place', time: 'acceptedAt' },
  places: { mode: 'closed_place', time: 'updatedAt' },
  place_applications: { mode: 'closed_application', time: 'closedAt' },
  place_application_audit: { mode: 'closed_application', time: 'createdAt' },
  place_metric_days: { mode: 'closed_day', time: 'date' },
  ai_attempt_days: { mode: 'closed_day', time: 'date' },
  notification_subscriptions: { mode: 'revoked_only', time: 'updatedAt' },
  billing_customers: { mode: 'closed_payment', time: 'review' },
  billing_owners: { mode: 'closed_payment', time: 'review' },
  billing_contracts: { mode: 'closed_payment', time: 'review' },
  billing_checkouts: { mode: 'closed_payment', time: 'review' },
  billing_events: { mode: 'closed_payment', time: 'review' },
  billing_receipts: { mode: 'closed_payment', time: 'review' },
  billing_analytics_preferences: { mode: 'closed_payment', time: 'review' },
  retention_audit: { mode: 'closed_audit', time: 'at' },
  retention_dispositions: { mode: 'closed_review', time: 'reviewedAt' },
  retention_holds: { mode: 'released_hold', time: 'releasedAt' },
  place_scope_audit: { mode: 'closed_scope', time: 'at' },
  ai_request_receipts: { mode: 'closed_request', time: 'createdAt' },
  ai_usage_receipts: { mode: 'closed_usage', time: 'createdAt' },
} as const;
export const LIFECYCLE_COLLECTIONS = Object.keys(definitions) as Array<
  keyof typeof definitions
>;
type Row = Record<string, unknown>;
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const identifier = (s: unknown): s is string =>
  typeof s === 'string' && /^[-a-zA-Z0-9_]{1,200}$/.test(s);
const uidValid = (s: unknown): s is string =>
  typeof s === 'string' &&
  s.length > 0 &&
  s.length <= 128 &&
  !s.includes('/') &&
  !s.includes('\\') &&
  s.split('').every((c) => c.charCodeAt(0) >= 32);
const ms = (v: unknown): number =>
  typeof v === 'number'
    ? v
    : typeof v === 'string'
      ? Date.parse(v)
      : v instanceof Date
        ? v.getTime()
        : v &&
            typeof v === 'object' &&
            'toMillis' in v &&
            typeof v.toMillis === 'function'
          ? v.toMillis()
          : NaN;
const stamp = (s: DocumentSnapshot) =>
  s.exists ? [s.updateTime?.seconds, s.updateTime?.nanoseconds] : null;
const reactionKind = (id: string, v: Row) =>
  ['post', 'comment'].find(
    (kind) =>
      typeof v.targetId === 'string' &&
      typeof v.actorId === 'string' &&
      id === `${kind}_${v.targetId}_${v.actorId}`,
  );
function endDay(v: unknown) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return NaN;
  const start = Date.parse(`${v}T00:00:00+09:00`);
  return Number.isFinite(start) &&
    new Date(start + 9 * 3600000).toISOString().slice(0, 10) === v
    ? start + 86400000
    : NaN;
}
function endMonth(id: string) {
  const m = /(?:^|_)(\d{4})-(\d{2})$/.exec(id);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]), 1) - 9 * 3600000;
}
const active = (r: Row | undefined, now: number) =>
  r?.plan === 'plus' &&
  ['active', 'trialing'].includes(String(r.status)) &&
  ms(r.expiresAt) > now;

/** Fixed Camellia collections only. No archive, auth identity, permanent decoration, or arbitrary path. */
export async function lifecycleCleanup(
  db: Firestore,
  name: string,
  options: {
    apply?: boolean;
    approvedDigest?: string;
    after?: string;
    now?: number;
  } = {},
) {
  if (!Object.hasOwn(definitions, name))
    throw new Error('RETENTION_COLLECTION_NOT_ALLOWED');
  if (options.after !== undefined && !identifier(options.after))
    throw new Error('INVALID_RETENTION_CURSOR');
  const collection = name as keyof typeof definitions,
    definition = definitions[collection],
    now = options.now ?? Date.now();
  return db.runTransaction(async (tx) => {
    const config = await tx.get(db.doc(`${SERVER_ROOT}/config/retention`)),
      cfg = config.data(),
      p = cfg?.collections?.[collection];
    if (cfg?.paused === true) throw new Error('RETENTION_PAUSED');
    if (
      cfg?.lifecycleVersion !== 'lifecycle_v1' ||
      p?.approved !== true ||
      p.mode !== definition.mode ||
      !Number.isSafeInteger(p.retentionMs) ||
      p.retentionMs <= 0 ||
      typeof p.approvedBy !== 'string' ||
      !p.approvedBy.trim() ||
      !Number.isFinite(ms(p.approvedAt)) ||
      ms(p.approvedAt) > now
    )
      throw new Error('RETENTION_NOT_APPROVED');
    if (
      collection.startsWith('billing_') &&
      (p.legalReviewApproved !== true ||
        typeof p.legalBasis !== 'string' ||
        !p.legalBasis.trim())
    )
      throw new Error('LEGAL_REVIEW_REQUIRED');
    const previous =
      options.apply && options.approvedDigest
        ? await tx.get(
            db.doc(`${SERVER_ROOT}/retention_audit/${options.approvedDigest}`),
          )
        : undefined;
    if (previous?.exists) {
      if (
        previous.data()?.collection !== collection ||
        previous.data()?.cursor !== (options.after ?? '')
      )
        throw new Error('RETENTION_PLAN_CHANGED');
      return {
        apply: true,
        reused: true,
        deleted: Number(previous.data()!.count),
        digest: options.approvedDigest,
      };
    }
    let query = db
      .collection(`${SERVER_ROOT}/${collection}`)
      .orderBy(FieldPath.documentId())
      .limit(20);
    if (options.after) query = query.startAfter(options.after);
    const rows = await tx.get(query),
      deps = new Map<string, unknown>(),
      deletes = new Set<string>(),
      held: Record<string, number> = {},
      eligible: DocumentSnapshot[] = [];
    const get = async (path: string) => {
      const s = await tx.get(db.doc(path));
      deps.set(path, stamp(s));
      return s;
    };
    const related = async (c: string, field: string, value: unknown) => {
      if (typeof value !== 'string')
        throw new Error('INVALID_RETENTION_REFERENCE');
      const q = await tx.get(
        db
          .collection(`${SERVER_ROOT}/${c}`)
          .where(field, '==', value)
          .limit(101),
      );
      deps.set(
        `${c}:${field}:${value}`,
        q.docs.map((d) => [d.id, stamp(d)]),
      );
      return q;
    };
    const campaignClosed = async () => {
      const c = (await get(`${SERVER_ROOT}/config/referral`)).data();
      return (
        c?.accepting === false &&
        Number.isFinite(ms(c.endsAt)) &&
        ms(c.endsAt) <= now
      );
    };
    const openReports = async (kind: string, id: string) => {
      const reports = await related('circle_reports', 'targetId', id);
      return (
        reports.size === 101 ||
        reports.docs.some(
          (d) => d.data().targetKind === kind && d.data().status === 'open',
        )
      );
    };
    for (const row of rows.docs) {
      const v = row.data() as Row,
        extras: string[] = [];
      let reason = '',
        anchor = ms(v[definition.time]);
      const hold = await get(
        `${SERVER_ROOT}/retention_holds/${hash(row.ref.path)}`,
      );
      if (
        v.legalHold === true ||
        (hold.exists && hold.data()?.active !== false)
      )
        reason = 'LEGAL_HOLD';
      const disposition = await get(
          `${SERVER_ROOT}/retention_dispositions/${hash(row.ref.path)}`,
        ),
        review = disposition.data();
      if (!reason) {
        if (collection === 'referral_codes') {
          const owner = uidValid(v.ownerUid)
            ? await get(`camellia_users/${v.ownerUid}`)
            : undefined;
          if (
            v.revoked !== true &&
            owner?.exists &&
            owner.createTime?.toMillis() === v.ownerCreatedAt
          )
            reason = 'ACTIVE_CODE';
          if (!uidValid(v.ownerUid)) reason = 'UNKNOWN_OWNER';
        } else if (collection === 'referral_ai_reservations') {
          const g = identifier(v.grantId)
            ? (await get(`${SERVER_ROOT}/referral_grants/${v.grantId}`)).data()
            : undefined;
          if (
            !g ||
            ms(g.expiresAt) > now ||
            g.budgetReconciled !== true ||
            g.costReviewRequired === true ||
            !(
              v.released === true ||
              (v.settled === true && v.usageIncomplete !== true)
            )
          )
            reason = 'UNSETTLED_TRIAL';
        } else if (collection === 'referral_identities') {
          const g = identifier(v.grantId)
            ? (await get(`${SERVER_ROOT}/referral_grants/${v.grantId}`)).data()
            : undefined;
          if (
            p.identityWindowDeletionApproved !== true ||
            !(await campaignClosed())
          )
            reason = 'IDENTITY_WINDOW_NOT_REVIEWED';
          else if (!g || ms(g.expiresAt) > now || g.budgetReconciled !== true)
            reason = 'UNSETTLED_TRIAL';
        } else if (collection === 'referral_grants') {
          if (
            !Number.isFinite(ms(v.expiresAt)) ||
            ms(v.expiresAt) > now ||
            v.budgetReconciled !== true ||
            v.costReviewRequired === true
          )
            reason = 'UNSETTLED_TRIAL';
          else {
            const a = await related(
                'referral_ai_reservations',
                'grantId',
                row.id,
              ),
              b = await related('referral_identities', 'grantId', row.id);
            if (!a.empty || !b.empty) reason = 'DEPENDENT_LEDGER';
            const owner = v.ownerUid ?? review?.ownerUid;
            if (!uidValid(owner) || hash(owner) !== row.id)
              reason = 'OWNER_REVIEW_REQUIRED';
            else {
              const mirror = await get(
                `camellia_users/${owner}/admin/referral_trial`,
              );
              if (mirror.exists) {
                if (
                  mirror.data()?.grantId !== row.id ||
                  !Number.isFinite(ms(mirror.data()?.expiresAt)) ||
                  ms(mirror.data()?.expiresAt) > now
                )
                  reason = 'ACTIVE_ENTITLEMENT';
                else extras.push(mirror.ref.path);
              }
            }
          }
        } else if (
          collection === 'referral_rewards' ||
          collection === 'referral_budgets'
        ) {
          anchor = endMonth(row.id);
          if (!Number.isFinite(anchor) || anchor > now)
            reason = 'ACTIVE_PERIOD';
          if (
            collection === 'referral_budgets' &&
            (review?.budgetClosureReviewed !== true ||
              JSON.stringify(review.targetVersion) !==
                JSON.stringify(stamp(row)))
          )
            reason = 'BUDGET_CLOSURE_REVIEW_REQUIRED';
          if (collection === 'referral_budgets' && !reason) {
            const start = new Date(
                Date.UTC(
                  new Date(anchor + 9 * 3600000).getUTCFullYear(),
                  new Date(anchor + 9 * 3600000).getUTCMonth() - 1,
                  1,
                ) -
                  9 * 3600000,
              ).toISOString(),
              end = new Date(anchor).toISOString();
            const grants = await tx.get(
              db
                .collection(`${SERVER_ROOT}/referral_grants`)
                .where('createdAt', '>=', start)
                .where('createdAt', '<', end)
                .limit(101),
            );
            deps.set(
              `budget:${row.id}`,
              grants.docs.map((d) => [d.id, stamp(d)]),
            );
            if (
              grants.size === 101 ||
              grants.docs.some(
                (d) =>
                  d.data().budgetReconciled !== true ||
                  ms(d.data().expiresAt) > now,
              )
            )
              reason = 'UNSETTLED_BUDGET';
          }
        } else if (
          collection === 'referral_audit' ||
          collection === 'referral_budget_audit'
        ) {
          if (!(await campaignClosed())) reason = 'ACTIVE_CAMPAIGN';
          const grant = identifier(v.grantId)
            ? await get(`${SERVER_ROOT}/referral_grants/${v.grantId}`)
            : undefined;
          if (
            grant?.exists &&
            (grant.data()?.budgetReconciled !== true ||
              grant.data()?.costReviewRequired === true)
          )
            reason = 'UNSETTLED_TRIAL';
          if (
            !grant?.exists &&
            v.operation !== 'expired_reservation_reconciled' &&
            (review?.trialClosureReviewed !== true ||
              JSON.stringify(review.targetVersion) !==
                JSON.stringify(stamp(row)))
          )
            reason = 'TRIAL_CLOSURE_REVIEW_REQUIRED';
        } else if (
          collection === 'circle_posts' ||
          collection === 'circle_comments'
        ) {
          const kind = collection === 'circle_posts' ? 'post' : 'comment';
          let closed =
            ['deleted', 'removed'].includes(String(v.status)) && v.text === '';
          if (
            !closed &&
            collection === 'circle_comments' &&
            p.parentCascadeReviewed === true &&
            identifier(v.postId)
          ) {
            const parent = await get(`${SERVER_ROOT}/circle_posts/${v.postId}`);
            closed = ['deleted', 'removed'].includes(
              String(parent.data()?.status),
            );
            if (closed) anchor = Math.max(anchor, ms(parent.data()?.updatedAt));
            if (await openReports('post', v.postId)) reason = 'OPEN_REPORT';
          }
          if (!closed) reason = 'LIVE_CONTENT';
          if (await openReports(kind, row.id)) reason = 'OPEN_REPORT';
          const reactions = await related(
            'circle_reactions',
            'targetId',
            row.id,
          );
          if (reactions.docs.some((d) => reactionKind(d.id, d.data()) === kind))
            reason = 'DEPENDENT_CONTENT';
          if (collection === 'circle_posts') {
            const children = await related('circle_comments', 'postId', row.id);
            if (!children.empty) reason = 'DEPENDENT_CONTENT';
          }
        } else if (
          collection === 'circle_reports' ||
          collection === 'circle_moderation_audit'
        ) {
          const report =
            collection === 'circle_reports'
              ? row
              : identifier(v.reportId)
                ? await get(`${SERVER_ROOT}/circle_reports/${v.reportId}`)
                : undefined;
          if (
            p.caseClosureReviewed !== true ||
            !report?.exists ||
            !['dismissed', 'resolved'].includes(String(report.data()?.status))
          )
            reason = 'OPEN_OR_UNREVIEWED_CASE';
          if (collection === 'circle_moderation_audit' && report?.exists)
            anchor = Math.max(anchor, ms(report.data()?.resolvedAt));
          if (collection === 'circle_reports') {
            const audit = await related(
              'circle_moderation_audit',
              'reportId',
              row.id,
            );
            if (!audit.empty) reason = 'DEPENDENT_AUDIT';
          }
        } else if (collection === 'circle_reactions') {
          const kind = reactionKind(row.id, v),
            post =
              identifier(v.targetId) && kind
                ? await get(
                    `${SERVER_ROOT}/${kind === 'post' ? 'circle_posts' : 'circle_comments'}/${v.targetId}`,
                  )
                : undefined;
          if (!identifier(v.targetId) || !kind) reason = 'UNKNOWN_PARENT';
          if (
            post?.exists &&
            !['deleted', 'removed'].includes(String(post.data()?.status))
          )
            reason = 'LIVE_CONTENT';
          if (post?.exists)
            anchor = Math.max(ms(v.updatedAt) || 0, ms(post.data()?.updatedAt));
          if (
            identifier(v.targetId) &&
            kind &&
            (await openReports(kind, v.targetId))
          )
            reason = 'OPEN_REPORT';
        } else if (
          collection === 'place_audit' ||
          collection === 'place_agreements' ||
          collection === 'places'
        ) {
          const slug = collection === 'places' ? row.id : v.slug,
            place = identifier(slug)
              ? await get(`${SERVER_ROOT}/places/${slug}`)
              : undefined;
          if (
            p.permissionEvidenceClosureReviewed !== true ||
            !place?.exists ||
            place.data()?.status !== 'suspended'
          )
            reason = 'ACTIVE_OR_UNREVIEWED_PLACE';
          else anchor = Math.max(anchor, ms(place.data()?.updatedAt));
          if (collection === 'places' && identifier(slug)) {
            if (
              review?.scopesRevokedReviewed !== true ||
              JSON.stringify(review.targetVersion) !==
                JSON.stringify(stamp(row))
            )
              reason = 'PLACE_SCOPE_REVIEW_REQUIRED';
            if (
              !(await related('place_audit', 'slug', slug)).empty ||
              (await get(`${SERVER_ROOT}/place_agreements/${slug}`)).exists
            )
              reason = 'DEPENDENT_PLACE_RECORD';
            const apps = await related('place_applications', 'placeSlug', slug);
            if (
              apps.size === 101 ||
              apps.docs.some((d) => d.data().scopeGranted === true)
            )
              reason = 'ACTIVE_PLACE_SCOPE';
          }
        } else if (
          collection === 'place_applications' ||
          collection === 'place_application_audit'
        ) {
          const app =
            collection === 'place_applications'
              ? row
              : identifier(v.applicationId)
                ? await get(
                    `${SERVER_ROOT}/place_applications/${v.applicationId}`,
                  )
                : undefined;
          if (!app?.exists) {
            if (
              review?.applicationClosureReviewed !== true ||
              JSON.stringify(review.targetVersion) !==
                JSON.stringify(stamp(row))
            )
              reason = 'APPLICATION_CLOSURE_REVIEW_REQUIRED';
            else anchor = Math.max(anchor, ms(review.closedAt));
          } else if (
            !['withdrawn', 'declined', 'archived'].includes(
              String(app.data()?.status),
            ) ||
            app.data()?.scopeGranted === true
          )
            reason = 'ACTIVE_APPLICATION';
          else anchor = Math.max(anchor, ms(app.data()?.closedAt));
          if (
            collection === 'place_applications' &&
            !(await related('place_application_audit', 'applicationId', row.id))
              .empty
          )
            reason = 'DEPENDENT_APPLICATION_AUDIT';
        } else if (
          collection === 'place_metric_days' ||
          collection === 'ai_attempt_days'
        ) {
          anchor = endDay(v.date);
          if (!Number.isFinite(anchor) || anchor > now)
            reason = 'ACTIVE_PERIOD';
        } else if (
          collection === 'retention_dispositions' ||
          collection === 'retention_holds'
        ) {
          if (
            typeof v.targetCollection !== 'string' ||
            !Object.hasOwn(definitions, v.targetCollection) ||
            !identifier(v.targetId) ||
            hash(`${SERVER_ROOT}/${v.targetCollection}/${v.targetId}`) !==
              row.id
          )
            reason = 'UNKNOWN_REVIEW_TARGET';
          else if (
            (await get(`${SERVER_ROOT}/${v.targetCollection}/${v.targetId}`))
              .exists
          )
            reason = 'LIVE_REVIEW_TARGET';
          if (collection === 'retention_holds' && v.active !== false)
            reason = 'LEGAL_HOLD';
        } else if (collection === 'place_scope_audit') {
          if (!uidValid(v.targetUid)) reason = 'UNKNOWN_OWNER';
          else {
            const scope = await get(
              `camellia_users/${v.targetUid}/admin/place_scope`,
            );
            if (
              !Array.isArray(scope.data()?.slugs) ||
              scope.data()!.slugs.length
            )
              reason = 'ACTIVE_PLACE_SCOPE';
            else anchor = Math.max(anchor, ms(scope.data()?.updatedAt));
          }
          if (
            review?.scopesRevokedReviewed !== true ||
            JSON.stringify(review.targetVersion) !== JSON.stringify(stamp(row))
          )
            reason = 'PLACE_SCOPE_REVIEW_REQUIRED';
        } else if (
          collection === 'ai_request_receipts' ||
          collection === 'ai_usage_receipts'
        ) {
          if (
            (v.state === 'started' || v.usageIncomplete === true) &&
            (review?.providerUsageReviewed !== true ||
              JSON.stringify(review.targetVersion) !==
                JSON.stringify(stamp(row)))
          )
            reason = 'UNSETTLED_PROVIDER_USAGE';
        } else if (collection === 'notification_subscriptions') {
          if (!uidValid(v.uid)) reason = 'UNKNOWN_OWNER';
          else {
            const owner = await get(`camellia_users/${v.uid}`),
              reg = await get(
                `camellia_users/${v.uid}/admin/notification_registration`,
              );
            if (
              v.active === true &&
              owner.exists &&
              owner.data()?.personalDeleteInProgress !== true &&
              reg.data()?.recipient === row.id
            )
              reason = 'ACTIVE_SUBSCRIPTION';
            else if (reg.data()?.recipient === row.id)
              extras.push(reg.ref.path);
          }
        } else if (collection.startsWith('billing_')) {
          if (
            review?.providerClosed !== true ||
            review?.managementNoLongerRequired !== true ||
            review?.legalReviewApproved !== true ||
            typeof review.reviewedBy !== 'string' ||
            !Number.isFinite(ms(review.reviewedAt)) ||
            typeof review.reason !== 'string' ||
            !review.reason.trim()
          )
            reason = 'PAYMENT_CLOSURE_REVIEW_REQUIRED';
          if (
            review &&
            JSON.stringify(review.targetVersion) !== JSON.stringify(stamp(row))
          )
            reason = 'PAYMENT_REVIEW_STALE';
          const dates = [
            review?.closedAt,
            v.createdAt,
            v.periodEnd,
            v.verifiedAt,
          ]
            .map(ms)
            .filter(Number.isFinite);
          anchor = Number.isFinite(ms(review?.closedAt))
            ? Math.max(...dates)
            : NaN;
          let owner: unknown = v.uid ?? review?.ownerUid;
          if (!owner && typeof v.owner === 'string') {
            const o = await get(`${SERVER_ROOT}/billing_owners/${v.owner}`);
            if (typeof o.data()?.customerId === 'string')
              owner = (
                await get(
                  `${SERVER_ROOT}/billing_customers/${hash(`stripe:${o.data()!.customerId}`)}`,
                )
              ).data()?.uid;
          }
          if (
            collection === 'billing_owners' &&
            !owner &&
            typeof v.customerId === 'string'
          )
            owner = (
              await get(
                `${SERVER_ROOT}/billing_customers/${hash(`stripe:${v.customerId}`)}`,
              )
            ).data()?.uid;
          if (
            !uidValid(owner) ||
            (typeof v.owner === 'string' && hash(owner) !== v.owner) ||
            (collection === 'billing_owners' && hash(owner) !== row.id)
          )
            reason = 'OWNER_REVIEW_REQUIRED';
          else {
            const sub = await get(
                `camellia_users/${owner}/admin/billing_subscription`,
              ),
              legacy = await get(`camellia_users/${owner}/admin/subscription`);
            if (
              active(sub.data(), now) ||
              active(legacy.data(), now) ||
              ms(v.expiresAt) > now
            )
              reason = 'ACTIVE_PAYMENT_RIGHT';
            if (
              (sub.exists && !Number.isFinite(ms(sub.data()?.expiresAt))) ||
              (legacy.data()?.plan === 'plus' &&
                !Number.isFinite(ms(legacy.data()?.expiresAt)))
            )
              reason = 'UNKNOWN_PAYMENT_STATE';
            if (
              collection === 'billing_checkouts' &&
              hash(`${owner}:${String(v.identityCreatedAt)}`) !== row.id
            )
              reason = 'OWNER_REVIEW_REQUIRED';
            if (
              collection === 'billing_analytics_preferences' &&
              hash(owner) !== row.id
            )
              reason = 'OWNER_REVIEW_REQUIRED';
            if (
              collection === 'billing_analytics_preferences' &&
              !(
                await related(
                  'billing_analytics_outbox',
                  'ownerHash',
                  hash(owner),
                )
              ).empty
            )
              reason = 'DEPENDENT_ANALYTICS_RECORD';
            if (['billing_customers', 'billing_owners'].includes(collection)) {
              for (const dependent of ['billing_events', 'billing_receipts'])
                if (!(await related(dependent, 'owner', hash(owner))).empty)
                  reason = 'DEPENDENT_PAYMENT_RECORD';
              if (!(await related('billing_contracts', 'uid', owner)).empty)
                reason = 'DEPENDENT_PAYMENT_RECORD';
              if (sub.exists) {
                if (ms(sub.data()?.expiresAt) <= now) extras.push(sub.ref.path);
                else
                  reason = Number.isFinite(ms(sub.data()?.expiresAt))
                    ? 'ACTIVE_PAYMENT_RIGHT'
                    : 'UNKNOWN_PAYMENT_STATE';
              }
            }
          }
        }
      }
      if (
        !Number.isFinite(anchor) &&
        review &&
        JSON.stringify(review.targetVersion) === JSON.stringify(stamp(row)) &&
        typeof review.reviewedBy === 'string' &&
        typeof review.reason === 'string' &&
        Number.isFinite(ms(review.closedAt))
      )
        anchor = ms(review.closedAt);
      if (!reason && (!Number.isFinite(anchor) || anchor < 0))
        reason = 'UNKNOWN_RETENTION_DATE';
      if (!reason && anchor + p.retentionMs > now) reason = 'WITHIN_RETENTION';
      if (reason) held[reason] = (held[reason] ?? 0) + 1;
      else {
        eligible.push(row);
        deletes.add(row.ref.path);
        extras.forEach((path) => deletes.add(path));
      }
    }
    const digest = hash(
      JSON.stringify({
        collection,
        cursor: options.after ?? '',
        config: stamp(config),
        rows: rows.docs.map((d) => [d.id, stamp(d)]),
        dependencies: [...deps].sort(([a], [b]) => a.localeCompare(b)),
        deletes: [...deletes].sort(),
      }),
    );
    const nextCursor = rows.size === 20 ? rows.docs.at(-1)?.id : undefined;
    if (!options.apply)
      return {
        apply: false,
        digest,
        eligible: eligible.length,
        documentDeletes: deletes.size,
        held,
        scanned: rows.size,
        nextCursor,
      };
    if (options.approvedDigest !== digest)
      throw new Error('RETENTION_PLAN_CHANGED');
    for (const path of deletes) tx.delete(db.doc(path));
    tx.create(db.doc(`${SERVER_ROOT}/retention_audit/${digest}`), {
      collection,
      cursor: options.after ?? '',
      count: eligible.length,
      documentDeletes: deletes.size,
      digest,
      at: new Date(now).toISOString(),
      engine: 'lifecycle_v1',
    });
    return {
      apply: true,
      reused: false,
      deleted: eligible.length,
      documentDeletes: deletes.size,
      digest,
      nextCursor,
    };
  });
}

/** Explicit private review, never a public-user route. Unknown legal obligations have no default. */
export async function reviewRetentionDisposition(
  db: Firestore,
  collection: string,
  id: string,
  input: unknown,
) {
  if (
    !Object.hasOwn(definitions, collection) ||
    !identifier(id) ||
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  )
    throw new Error('INVALID_RETENTION_REVIEW');
  const v = input as Row;
  if (
    Object.keys(v).some(
      (k) =>
        ![
          'ownerUid',
          'providerClosed',
          'managementNoLongerRequired',
          'legalReviewApproved',
          'scopesRevokedReviewed',
          'budgetClosureReviewed',
          'trialClosureReviewed',
          'applicationClosureReviewed',
          'providerUsageReviewed',
          'reviewedBy',
          'reason',
          'closedAt',
        ].includes(k),
    ) ||
    typeof v.reviewedBy !== 'string' ||
    !v.reviewedBy.trim() ||
    typeof v.reason !== 'string' ||
    !v.reason.trim() ||
    v.reason.length > 1000 ||
    !Number.isFinite(ms(v.closedAt)) ||
    ms(v.closedAt) > Date.now() ||
    (v.ownerUid !== undefined && !uidValid(v.ownerUid))
  )
    throw new Error('INVALID_RETENTION_REVIEW');
  const ref = db.doc(`${SERVER_ROOT}/${collection}/${id}`);
  return db.runTransaction(async (tx) => {
    const row = await tx.get(ref);
    if (!row.exists) throw new Error('RETENTION_RECORD_NOT_FOUND');
    tx.set(db.doc(`${SERVER_ROOT}/retention_dispositions/${hash(ref.path)}`), {
      ...v,
      targetVersion: stamp(row),
      targetCollection: collection,
      targetId: id,
      reviewedAt: new Date().toISOString(),
    });
    return { reviewed: true, recordHash: hash(ref.path) };
  });
}
