import { randomBytes } from 'node:crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { SERVER_ROOT } from '../server/admin.js';
import { referralConfiguration } from './config.js';
import { referralHash, verifiedReferralIdentity } from './identity.js';
import { ReferralService, ReferralError } from './service.js';
const validToken = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v);
/** A server timestamp before account creation proves this is a registration journey, not an old account claiming later. */
export class ReferralRegistration {
  constructor(
    private db: Firestore,
    private auth: Pick<Auth, 'getUser'>,
    private now = Date.now,
  ) {}
  async capture(token: unknown) {
    if (!validToken(token)) throw new ReferralError(400, 'INVALID_REFERRAL');
    const cfg = referralConfiguration(
        (await this.db.doc(`${SERVER_ROOT}/config/referral`).get()).data(),
      ).config,
      now = this.now();
    if (
      !cfg ||
      !cfg.accepting ||
      now < Date.parse(cfg.startsAt) ||
      now >= Date.parse(cfg.endsAt)
    )
      throw new ReferralError(503, 'CAMPAIGN_STOPPED');
    const code = await this.db
      .doc(`${SERVER_ROOT}/referral_codes/${referralHash(token)}`)
      .get();
    if (!code.exists || code.data()?.revoked)
      throw new ReferralError(404, 'INVALID_REFERRAL');
    const intent = randomBytes(32).toString('base64url');
    await this.db
      .doc(`${SERVER_ROOT}/referral_intents/${referralHash(intent)}`)
      .create({
        codeHash: referralHash(token),
        createdAt: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(now + 10 * 60 * 1000),
      });
    return { intent, expiresAt: new Date(now + 10 * 60 * 1000).toISOString() };
  }
  async complete(uid: string, token: unknown, intent: unknown) {
    if (!validToken(token) || !validToken(intent))
      throw new ReferralError(400, 'INVALID_REFERRAL');
    const identity = await verifiedReferralIdentity(this.db, this.auth, uid),
      ref = this.db.doc(
        `${SERVER_ROOT}/referral_intents/${referralHash(intent)}`,
      ),
      profile = await this.db.doc(`camellia_users/${uid}`).get();
    await this.db.runTransaction(async (tx) => {
      const row = await tx.get(ref),
        v = row.data();
      if (
        !v ||
        v.codeHash !== referralHash(token) ||
        v.expiresAt.toMillis() <= this.now() ||
        (v.uid && v.uid !== uid)
      )
        throw new ReferralError(409, 'REGISTRATION_INTENT_INVALID');
      if (
        !profile.exists ||
        identity.createdAt < v.createdAt.toMillis() ||
        profile.createTime!.toMillis() < v.createdAt.toMillis()
      )
        throw new ReferralError(403, 'NEW_REGISTRATION_REQUIRED');
      if (
        v.ownerCreatedAt &&
        v.ownerCreatedAt !== profile.createTime!.toMillis()
      )
        throw new ReferralError(409, 'REGISTRATION_INTENT_INVALID');
      tx.update(ref, {
        uid,
        ownerCreatedAt: profile.createTime!.toMillis(),
        completedAt: Timestamp.fromMillis(this.now()),
      });
    });
    return new ReferralService(this.db, this.auth, this.now).grant(uid, token);
  }
}
