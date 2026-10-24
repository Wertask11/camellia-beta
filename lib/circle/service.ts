import { createHmac } from 'node:crypto';
import {
  FieldPath,
  FieldValue,
  type Firestore,
  type Transaction,
  type DocumentReference,
} from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import {
  CIRCLES,
  GUIDELINES_VERSION,
  REACTIONS,
  REPORT_REASONS,
  type CircleReactionCounts,
} from './catalog.js';
export type CircleIdentity = { uid: string; moderator: boolean };
export class CircleError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
const requireValue = (ok: unknown, status = 400, code = 'INVALID_INPUT') => {
  if (!ok) throw new CircleError(status, code);
};
function text(value: unknown, max = 500) {
  requireValue(typeof value === 'string');
  const clean = (value as string).trim();
  requireValue(clean.length > 0 && Array.from(clean).length <= max);
  requireValue(
    !Array.from(clean).some((char) => {
      const code = char.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13;
    }),
  );
  requireValue(
    !/https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|0\d{1,4}[- ]?\d{1,4}[- ]?\d{3,4}|自殺しろ|死ね|必ず治る|薬をやめろ|あなたはうつ病/iu.test(
      clean,
    ),
    400,
    'CONTENT_NOT_ALLOWED',
  );
  return clean;
}

const PAGE_SIZE = 20;
const emptyReactionCounts = (): CircleReactionCounts => ({
  'わかる': 0, 'そっと応援': 0, '参考になった': 0,
});
function storedReactionCounts(data: Record<string, unknown>) {
  const counts = data.receivedReactionCounts as CircleReactionCounts | undefined;
  return data.reactionCountsVersion === 1 && counts && REACTIONS.every(
    (reaction) => Number.isSafeInteger(counts[reaction]) && counts[reaction] >= 0,
  ) ? Object.fromEntries(REACTIONS.map((reaction) => [reaction, counts[reaction]])) as CircleReactionCounts : undefined;
}
type Cursor = { at: string; id: string };
function decodeCursor(
  value: string | undefined,
  scope: string,
): Cursor | undefined {
  if (!value) return undefined;
  try {
    requireValue(value.length <= 700 && /^[A-Za-z0-9_-]+$/.test(value));
    const item = JSON.parse(Buffer.from(value, 'base64url').toString());
    requireValue(
      item.scope === scope &&
        typeof item.at === 'string' &&
        Number.isFinite(Date.parse(item.at)) &&
        /^[\w-]{1,160}$/.test(item.id),
    );
    return { at: item.at, id: item.id };
  } catch {
    throw new CircleError(400, 'INVALID_CURSOR');
  }
}
function nextCursor(
  scope: string,
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
) {
  if (docs.length <= PAGE_SIZE) return undefined;
  const last = docs[PAGE_SIZE - 1];
  return Buffer.from(
    JSON.stringify({ scope, at: last.data().createdAt, id: last.id }),
  ).toString('base64url');
}

export class CircleService {
  constructor(
    private db: Firestore,
    private secret: string,
  ) {
    requireValue(secret.length >= 32, 503, 'COMMUNITY_NOT_CONFIGURED');
  }
  private col(name: string) {
    return this.db.collection(`${SERVER_ROOT}/${name}`);
  }
  private changed(tx: Transaction, circle: string) {
    tx.set(this.col('circle_activity').doc(circle), { version: FieldValue.increment(1) }, { merge: true });
  }
  /** A member-only change counter; no content or identity is returned. */
  async version(identity: CircleIdentity, circle: string) {
    return this.db.runTransaction(async (tx) => {
      await this.requireMember(tx, identity, circle);
      const activity = await tx.get(this.col('circle_activity').doc(circle));
      return { version: Number(activity.data()?.version ?? 0) };
    });
  }
  author(uid: string) {
    return createHmac('sha256', this.secret)
      .update(uid)
      .digest('hex')
      .slice(0, 32);
  }
  private memberRef(uid: string, circle: string) {
    return this.col('circle_memberships').doc(`${circle}_${this.author(uid)}`);
  }
  private async requireMember(
    tx: Transaction,
    identity: CircleIdentity,
    circle: string,
  ) {
    requireValue(CIRCLES.some((c) => c.id === circle));
    const member = await tx.get(this.memberRef(identity.uid, circle));
    requireValue(member.data()?.active === true, 403, 'MEMBERSHIP_REQUIRED');
    return member.data()!;
  }
  private publicPost(
    id: string,
    data: Record<string, unknown>,
    identity: CircleIdentity,
  ) {
    return {
      id,
      circleId: data.circleId,
      authorId: data.authorId,
      displayName: data.displayName,
      text: data.text,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      mine: data.uid === identity.uid,
    };
  }
  /** Old posts are initialized once, without a new composite index or exposing actors. */
  private async reactionCounts(
    tx: Transaction,
    data: Record<string, unknown>,
    kind: 'post' | 'comment',
    id: string,
  ): Promise<CircleReactionCounts> {
    const stored = storedReactionCounts(data);
    if (stored) return stored;
    const counts = emptyReactionCounts();
    const prefix = `${kind}_${id}_`;
    const existing = await tx.get(this.col('circle_reactions')
      .orderBy(FieldPath.documentId()).startAt(prefix).endBefore(`${prefix}\uf8ff`));
    const owner = this.author(String(data.uid));
    for (const record of existing.docs) {
      const item = record.data();
      if (item.targetId !== id || record.id !== `${prefix}${item.actorId}` || item.actorId === owner) continue;
      if (REACTIONS.includes(item.reaction)) counts[item.reaction as keyof CircleReactionCounts]++;
    }
    return counts;
  }
  private async receivedReactions(identity: CircleIdentity, kind: 'post' | 'comment', id: string) {
    const target: DocumentReference = this.col(kind === 'post' ? 'circle_posts' : 'circle_comments').doc(id);
    return this.db.runTransaction(async (tx) => {
      const item = await tx.get(target);
      const data = item.data();
      if (!data || data.uid !== identity.uid || data.status !== 'active') return undefined;
      const counts = await this.reactionCounts(tx, data, kind, id);
      if (!storedReactionCounts(data)) tx.update(target, { receivedReactionCounts: counts, reactionCountsVersion: 1 });
      return counts;
    });
  }
  private async withReactions(
    items: ReturnType<CircleService['publicPost']>[],
    identity: CircleIdentity,
    kind: 'post' | 'comment',
  ) {
    if (!items.length) return [];
    const reactions = await this.db.getAll(
      ...items.map((item) =>
        this.col('circle_reactions').doc(
          `${kind}_${item.id}_${this.author(identity.uid)}`,
        ),
      ),
    );
    return Promise.all(items.map(async (item, index) => ({
      ...item,
      myReaction: REACTIONS.includes(reactions[index].data()?.reaction)
        ? reactions[index].data()?.reaction
        : null,
      ...(item.mine ? { receivedReactions: await this.receivedReactions(identity, kind, item.id) } : {}),
    })));
  }
  async list(identity: CircleIdentity) {
    const memberships = await this.col('circle_memberships')
      .where('uid', '==', identity.uid)
      .get();
    return Promise.all(
      CIRCLES.map(async (c) => ({
        ...c,
        joined: memberships.docs.some(
          (d) => d.data().circleId === c.id && d.data().active === true,
        ),
        daysSinceJoin: (() => {
          const joined = memberships.docs
            .find((d) => d.data().circleId === c.id && d.data().active === true)
            ?.data().joinedAt;
          const jstDay = (date: number) =>
            Date.parse(new Date(date + 9 * 3600000).toISOString().slice(0, 10));
          return typeof joined === 'string'
            ? Math.max(
                0,
                Math.floor(
                  (jstDay(Date.now()) - jstDay(Date.parse(joined))) / 86400000,
                ),
              )
            : undefined;
        })(),
        memberCount: (
          await this.col('circle_memberships')
            .where('circleId', '==', c.id)
            .where('active', '==', true)
            .count()
            .get()
        ).data().count,
      })),
    );
  }
  async ownPage(
    identity: CircleIdentity,
    kind: 'post' | 'comment',
    cursor?: string,
  ) {
    const scope = `own:${kind}:${this.author(identity.uid)}`;
    const after = decodeCursor(cursor, scope);
    let query = this.col(kind === 'post' ? 'circle_posts' : 'circle_comments')
      .where('uid', '==', identity.uid)
      .orderBy('createdAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc')
      .limit(PAGE_SIZE + 1);
    if (after) query = query.startAfter(after.at, after.id);
    const result = await query.get();
    return {
      own: (await this.withReactions(result.docs
        .slice(0, PAGE_SIZE)
        .filter((d) => d.data().status === 'active')
        .map((d) => this.publicPost(d.id, d.data(), identity)), identity, kind))
        .map((item) => ({ ...item, kind })),
      nextOwnCursor: nextCursor(scope, result.docs),
    };
  }

  async own(identity: CircleIdentity) {
    const results = await Promise.all(
      ['circle_posts', 'circle_comments'].map(async (collection) => {
        const records = await this.col(collection)
          .where('uid', '==', identity.uid)
          .limit(PAGE_SIZE)
          .get();
        return records.docs
          .filter((d) => d.data().status === 'active')
          .map((d) => ({
            ...this.publicPost(d.id, d.data(), identity),
            kind: collection === 'circle_posts' ? 'post' : 'comment',
          }));
      }),
    );
    return results.flat();
  }
  async blocks(identity: CircleIdentity) {
    const records = await this.col('circle_blocks')
      .where('ownerId', '==', this.author(identity.uid))
      .get();
    return records.docs.map((d) => String(d.data().targetId));
  }
  async join(
    identity: CircleIdentity,
    circle: string,
    body: Record<string, unknown>,
  ) {
    requireValue(CIRCLES.some((c) => c.id === circle));
    requireValue(
      body.guidelinesVersion === GUIDELINES_VERSION,
      400,
      'GUIDELINES_REQUIRED',
    );
    const displayName = text(body.displayName, 20);
    requireValue(
      identity.moderator || !/運営|管理者|公式/.test(displayName),
      400,
      'RESERVED_NAME',
    );
    await this.memberRef(identity.uid, circle).set({
      uid: identity.uid,
      authorId: this.author(identity.uid),
      circleId: circle,
      displayName,
      active: true,
      joinedAt: new Date().toISOString(),
      guidelinesVersion: GUIDELINES_VERSION,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  }
  async leave(identity: CircleIdentity, circle: string) {
    requireValue(CIRCLES.some((c) => c.id === circle));
    await this.db.runTransaction(async (tx) => {
      await this.requireMember(tx, identity, circle);
      tx.update(this.memberRef(identity.uid, circle), {
        active: false,
        updatedAt: new Date().toISOString(),
      });
    });
    return { ok: true };
  }
  async feed(
    identity: CircleIdentity,
    circle: string,
    postId?: string,
    cursor?: string,
  ) {
    // Read before the feed so concurrent writes are not marked as already seen.
    const { version } = await this.version(identity, circle);
    const blocks = await this.col('circle_blocks')
      .where('ownerId', '==', this.author(identity.uid))
      .get();
    const blocked = new Set(blocks.docs.map((d) => d.data().targetId));
    const visible = (d: { data: () => Record<string, unknown> | undefined }) =>
      d.data()?.status === 'active' && !blocked.has(d.data()?.authorId);
    if (postId) {
      const parent = await this.col('circle_posts').doc(postId).get();
      requireValue(
        parent.exists && parent.data()?.circleId === circle && visible(parent),
        404,
        'NOT_FOUND',
      );
      const scope = `comments:${circle}:${postId}`;
      const after = decodeCursor(cursor, scope);
      let query = this.col('circle_comments')
        .where('postId', '==', postId)
        .orderBy('createdAt', 'asc')
        .orderBy(FieldPath.documentId(), 'asc')
        .limit(PAGE_SIZE + 1);
      if (after) query = query.startAfter(after.at, after.id);
      const result = await query.get();
      return {
        version,
        posts: await this.withReactions(
          [this.publicPost(parent.id, parent.data()!, identity)],
          identity,
          'post',
        ),
        comments: await this.withReactions(
          result.docs
            .slice(0, PAGE_SIZE)
            .filter(visible)
            .map((d) => this.publicPost(d.id, d.data(), identity)),
          identity,
          'comment',
        ),
        nextCursor: nextCursor(scope, result.docs),
      };
    }
    const scope = `posts:${circle}`;
    const after = decodeCursor(cursor, scope);
    let query = this.col('circle_posts')
      .where('circleId', '==', circle)
      .orderBy('createdAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc')
      .limit(PAGE_SIZE + 1);
    if (after) query = query.startAfter(after.at, after.id);
    const result = await query.get();
    return {
      version,
      posts: await this.withReactions(
        result.docs
          .slice(0, PAGE_SIZE)
          .filter(visible)
          .map((d) => this.publicPost(d.id, d.data(), identity)),
        identity,
        'post',
      ),
      comments: [],
      nextCursor: nextCursor(scope, result.docs),
    };
  }

  async write(
    identity: CircleIdentity,
    circle: string,
    body: Record<string, unknown>,
  ) {
    const content = text(body.text);
    const comment = typeof body.postId === 'string';
    requireValue(!comment || /^[\w-]{1,160}$/.test(String(body.postId)));
    const ref = this.col(comment ? 'circle_comments' : 'circle_posts').doc();
    const now = new Date().toISOString();
    await this.db.runTransaction(async (tx) => {
      const member = await this.requireMember(tx, identity, circle);
      if (comment) {
        const parent = await tx.get(
          this.col('circle_posts').doc(String(body.postId)),
        );
        requireValue(
          parent.data()?.circleId === circle &&
            parent.data()?.status === 'active',
          404,
          'NOT_FOUND',
        );
        const blocked = await tx.get(
          this.col('circle_blocks').doc(
            `${this.author(identity.uid)}_${parent.data()?.authorId}`,
          ),
        );
        requireValue(!blocked.exists, 403, 'NOT_AVAILABLE');
      }
      const recent = await tx.get(
        this.col('circle_write_limits').doc(this.author(identity.uid)),
      );
      requireValue(
        Date.now() - Number(recent.data()?.at ?? 0) >= 5000,
        429,
        'SLOW_DOWN',
      );
      tx.set(ref, {
        uid: identity.uid,
        authorId: this.author(identity.uid),
        displayName: member.displayName,
        circleId: circle,
        ...(comment ? { postId: body.postId } : {}),
        text: content,
        status: 'active',
        receivedReactionCounts: emptyReactionCounts(),
        reactionCountsVersion: 1,
        createdAt: now,
        updatedAt: now,
      });
      tx.set(this.col('circle_write_limits').doc(this.author(identity.uid)), {
        at: Date.now(),
      });
      this.changed(tx, circle);
    });
    return { id: ref.id };
  }
  async change(
    identity: CircleIdentity,
    kind: 'post' | 'comment',
    id: string,
    operation: 'edit' | 'delete',
    body: Record<string, unknown>,
  ) {
    const ref = this.col(
      kind === 'post' ? 'circle_posts' : 'circle_comments',
    ).doc(id);
    await this.db.runTransaction(async (tx) => {
      const item = await tx.get(ref);
      requireValue(
        item.exists && item.data()?.status === 'active',
        404,
        'NOT_FOUND',
      );
      const data = item.data()!;
      requireValue(data.uid === identity.uid, 403, 'NOT_OWNER');
      if (operation === 'edit') {
        await this.requireMember(tx, identity, data.circleId);
        tx.update(ref, {
          text: text(body.text),
          updatedAt: new Date().toISOString(),
        });
      } else
        tx.update(ref, {
          text: '',
          status: 'deleted',
          updatedAt: new Date().toISOString(),
        });
      this.changed(tx, data.circleId);
    });
    return { ok: true };
  }
  async report(
    identity: CircleIdentity,
    kind: 'post' | 'comment',
    id: string,
    reason: unknown,
  ) {
    requireValue(
      REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number]),
    );
    const target = this.col(
      kind === 'post' ? 'circle_posts' : 'circle_comments',
    ).doc(id);
    const report = this.col('circle_reports').doc(
      `${kind}_${id}_${this.author(identity.uid)}`,
    );
    await this.db.runTransaction(async (tx) => {
      const item = await tx.get(target);
      requireValue(
        item.exists && item.data()?.status === 'active',
        404,
        'NOT_FOUND',
      );
      await this.requireMember(tx, identity, item.data()!.circleId);
      const existing = await tx.get(report);
      if (existing.exists) return;
      const quota = this.col('circle_report_limits').doc(
        this.author(identity.uid),
      );
      const previous = await tx.get(quota);
      const window = Math.floor(Date.now() / 300000);
      const used =
        previous.data()?.window === window
          ? Number(previous.data()?.count ?? 0)
          : 0;
      requireValue(used < 10, 429, 'SLOW_DOWN');
      tx.set(quota, { window, count: used + 1 });
      tx.set(report, {
        reporterUid: identity.uid,
        targetKind: kind,
        targetId: id,
        circleId: item.data()!.circleId,
        reason,
        status: 'open',
        createdAt: new Date().toISOString(),
      });
    });
    return { ok: true };
  }
  async block(identity: CircleIdentity, targetId: string, remove = false) {
    requireValue(
      /^[a-f0-9]{32}$/.test(targetId) && targetId !== this.author(identity.uid),
    );
    const ref = this.col('circle_blocks').doc(
      `${this.author(identity.uid)}_${targetId}`,
    );
    if (remove) await ref.delete();
    else
      await ref.set({
        ownerId: this.author(identity.uid),
        targetId,
        createdAt: new Date().toISOString(),
      });
    return { ok: true };
  }
  async react(
    identity: CircleIdentity,
    kind: 'post' | 'comment',
    id: string,
    reaction: unknown,
  ) {
    requireValue(REACTIONS.includes(reaction as (typeof REACTIONS)[number]));
    const target = this.col(
      kind === 'post' ? 'circle_posts' : 'circle_comments',
    ).doc(id);
    const ref = this.col('circle_reactions').doc(
      `${kind}_${id}_${this.author(identity.uid)}`,
    );
    const selected = await this.db.runTransaction(async (tx) => {
      const item = await tx.get(target);
      requireValue(
        item.exists && item.data()?.status === 'active',
        404,
        'NOT_FOUND',
      );
      await this.requireMember(tx, identity, item.data()!.circleId);
      const current = await tx.get(ref);
      const data = item.data()!;
      const counts = await this.reactionCounts(tx, data, kind, id);
      const previous = current.data()?.reaction;
      const next = previous === reaction ? null : reaction as (typeof REACTIONS)[number];
      if (data.uid !== identity.uid) {
        if (REACTIONS.includes(previous)) counts[previous as keyof CircleReactionCounts] = Math.max(0, counts[previous as keyof CircleReactionCounts] - 1);
        if (next) counts[next]++;
      }
      tx.update(target, { receivedReactionCounts: counts, reactionCountsVersion: 1 });
      this.changed(tx, item.data()!.circleId);
      if (next === null) {
        tx.delete(ref);
        return null;
      } else
        tx.set(ref, {
          actorId: this.author(identity.uid),
          targetId: id,
          reaction,
          updatedAt: new Date().toISOString(),
        });
      return reaction as string;
    });
    return { ok: true, reaction: selected };
  }
  async moderation(
    identity: CircleIdentity,
    body?: Record<string, unknown>,
    cursor?: string,
  ) {
    requireValue(identity.moderator, 403, 'MODERATOR_REQUIRED');
    if (!body) {
      const after = decodeCursor(cursor, 'moderation');
      let query = this.col('circle_reports')
        .where('status', '==', 'open')
        .orderBy('createdAt', 'desc')
        .orderBy(FieldPath.documentId(), 'desc')
        .limit(PAGE_SIZE + 1);
      if (after) query = query.startAfter(after.at, after.id);
      const queue = await query.get();
      return Promise.all(
        queue.docs.slice(0, PAGE_SIZE).map(async (d) => {
          const data = d.data();
          const target = await this.col(
            data.targetKind === 'post' ? 'circle_posts' : 'circle_comments',
          )
            .doc(data.targetId)
            .get();
          return {
            id: d.id,
            targetKind: data.targetKind,
            targetId: data.targetId,
            circleId: data.circleId,
            authorId: target.data()?.authorId ?? '',
            reason: data.reason,
            status: data.status,
            createdAt: data.createdAt,
            text: target.data()?.text ?? '',
            nextCursor: nextCursor('moderation', queue.docs),
          };
        }),
      );
    }
    const id = typeof body.reportId === 'string' ? body.reportId : '';
    requireValue(/^[\w-]{1,260}$/.test(id));
    const action = body.action ?? 'remove';
    requireValue(action === 'remove' || action === 'dismiss' || action === 'suspend');
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    requireValue(Array.from(note).length <= 200);
    const report = this.col('circle_reports').doc(id);
    await this.db.runTransaction(async (tx) => {
      const item = await tx.get(report);
      requireValue(item.exists, 404, 'NOT_FOUND');
      const data = item.data()!;
      requireValue(data.status === 'open', 409, 'ALREADY_REVIEWED');
      requireValue(data.targetKind === 'post' || data.targetKind === 'comment');
      const target = this.col(
        data.targetKind === 'post' ? 'circle_posts' : 'circle_comments',
      ).doc(data.targetId);
      const original = await tx.get(target);
      requireValue(original.exists, 404, 'NOT_FOUND');
      const now = new Date().toISOString();
      if (action !== 'dismiss')
        tx.update(target, { text: '', status: 'removed', updatedAt: now });
      if (action !== 'dismiss') this.changed(tx, original.data()!.circleId);
      /* Stop the author's account as well. Same documents as SchoolPark's admin screen
         (backend/camellia-access.js), so the stop shows up and can be undone there. Records are kept. */
      if (action === 'suspend') {
        const authorUid = String(original.data()!.uid ?? '');
        requireValue(/^[\w:-]{1,128}$/.test(authorUid), 404, 'NOT_FOUND');
        const reason = data.reason === '対象外の利用者かもしれない' ? 'not_eligible' : 'terms';
        const at = Date.now();
        tx.set(this.db.doc(`camellia_users/${authorUid}/admin/access`), { suspended: true, suspendedReason: reason, suspendedAt: at, suspendedBy: `circle:${identity.uid}` }, { merge: true });
        tx.set(this.col('suspended').doc(authorUid), { uid: authorUid, camelliaId: '', reason, suspendedAt: at, suspendedBy: `circle:${identity.uid}` });
        tx.set(this.col('access_audit').doc(), { action: 'user.suspend', by: `circle:${identity.uid}`, uid: authorUid, reason, reportId: id, at });
      }
      tx.update(report, {
        status: action === 'dismiss' ? 'dismissed' : 'resolved',
        resolvedAt: now,
      });
      tx.set(this.col('circle_moderation_audit').doc(), {
        moderatorUid: identity.uid,
        targetId: data.targetId,
        targetKind: data.targetKind,
        authorId: original.data()?.authorId ?? '',
        reportId: id,
        action,
        note,
        createdAt: now,
      });
    });
    return { ok: true };
  }
  async moderationHistory(identity: CircleIdentity, cursor?: string) {
    requireValue(identity.moderator, 403, 'MODERATOR_REQUIRED');
    const after = decodeCursor(cursor, 'audit');
    let query = this.col('circle_moderation_audit')
      .orderBy('createdAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc')
      .limit(PAGE_SIZE + 1);
    if (after) query = query.startAfter(after.at, after.id);
    const result = await query.get();
    return {
      audits: result.docs.slice(0, PAGE_SIZE).map((d) => {
        const item = d.data();
        return {
          id: d.id,
          action: item.action,
          note: item.note,
          targetId: item.targetId,
          targetKind: item.targetKind,
          authorId: item.authorId,
          createdAt: item.createdAt,
          moderatorId: this.author(item.moderatorUid),
        };
      }),
      nextAuditCursor: nextCursor('audit', result.docs),
    };
  }
}
