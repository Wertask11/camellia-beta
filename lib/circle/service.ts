import { createHmac } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import {
  CIRCLES,
  GUIDELINES_VERSION,
  REACTIONS,
  REPORT_REASONS,
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
  async list(identity: CircleIdentity) {
    const memberships = await this.col('circle_memberships')
      .where('uid', '==', identity.uid)
      .get();
    return CIRCLES.map((c) => ({
      ...c,
      joined: memberships.docs.some(
        (d) => d.data().circleId === c.id && d.data().active === true,
      ),
    }));
  }
  async own(identity: CircleIdentity) {
    const results = await Promise.all(
      ['circle_posts', 'circle_comments'].map(async (collection) => {
        const records = await this.col(collection)
          .where('uid', '==', identity.uid)
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
  async feed(identity: CircleIdentity, circle: string, postId?: string) {
    await this.db.runTransaction((tx) =>
      this.requireMember(tx, identity, circle),
    );
    const author = this.author(identity.uid);
    const blocks = await this.col('circle_blocks')
      .where('ownerId', '==', author)
      .get();
    const blocked = new Set(blocks.docs.map((d) => d.data().targetId));
    const posts = await this.col('circle_posts')
      .where('circleId', '==', circle)
      .orderBy('createdAt', 'desc')
      .limit(40)
      .get();
    const visible = posts.docs
      .filter(
        (d) => d.data().status === 'active' && !blocked.has(d.data().authorId),
      )
      .map((d) => this.publicPost(d.id, d.data(), identity));
    let comments: ReturnType<CircleService['publicPost']>[] = [];
    if (postId) {
      requireValue(
        visible.some((p) => p.id === postId),
        404,
        'NOT_FOUND',
      );
      const result = await this.col('circle_comments')
        .where('postId', '==', postId)
        .orderBy('createdAt', 'asc')
        .limit(60)
        .get();
      comments = result.docs
        .filter(
          (d) =>
            d.data().status === 'active' && !blocked.has(d.data().authorId),
        )
        .map((d) => this.publicPost(d.id, d.data(), identity));
    }
    return { posts: visible, comments };
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
        createdAt: now,
        updatedAt: now,
      });
      tx.set(this.col('circle_write_limits').doc(this.author(identity.uid)), {
        at: Date.now(),
      });
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
      if (!existing.exists)
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
    await this.db.runTransaction(async (tx) => {
      const item = await tx.get(target);
      requireValue(
        item.exists && item.data()?.status === 'active',
        404,
        'NOT_FOUND',
      );
      await this.requireMember(tx, identity, item.data()!.circleId);
      const current = await tx.get(ref);
      if (current.data()?.reaction === reaction) tx.delete(ref);
      else
        tx.set(ref, {
          actorId: this.author(identity.uid),
          targetId: id,
          reaction,
          updatedAt: new Date().toISOString(),
        });
    });
    return { ok: true };
  }
  async moderation(identity: CircleIdentity, body?: Record<string, unknown>) {
    requireValue(identity.moderator, 403, 'MODERATOR_REQUIRED');
    if (!body) {
      const queue = await this.col('circle_reports')
        .where('status', '==', 'open')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return Promise.all(
        queue.docs.map(async (d) => {
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
            reason: data.reason,
            status: data.status,
            createdAt: data.createdAt,
            text: target.data()?.text ?? '',
          };
        }),
      );
    }
    const id = typeof body.reportId === 'string' ? body.reportId : '';
    requireValue(id.length > 0 && !id.includes('/'));
    const report = this.col('circle_reports').doc(id);
    await this.db.runTransaction(async (tx) => {
      const item = await tx.get(report);
      requireValue(item.exists, 404, 'NOT_FOUND');
      const data = item.data()!;
      requireValue(data.targetKind === 'post' || data.targetKind === 'comment');
      const target = this.col(
        data.targetKind === 'post' ? 'circle_posts' : 'circle_comments',
      ).doc(data.targetId);
      const original = await tx.get(target);
      requireValue(original.exists, 404, 'NOT_FOUND');
      tx.update(target, {
        text: '',
        status: 'removed',
        updatedAt: new Date().toISOString(),
      });
      tx.update(report, {
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
      });
      tx.set(this.col('circle_moderation_audit').doc(), {
        moderatorUid: identity.uid,
        targetId: data.targetId,
        reportId: id,
        at: new Date().toISOString(),
      });
    });
    return { ok: true };
  }
}
