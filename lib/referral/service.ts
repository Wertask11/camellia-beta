import { randomBytes } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import { subscriptionPath } from '../membership/server.js';
import {
  referralConfiguration,
  REFERRAL_TRIAL_DAYS,
  REFERRER_MONTHLY_REWARDS,
} from './config.js';
import { referralHash, verifiedReferralIdentity } from './identity.js';
export class ReferralError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
function reject(ok: unknown, code: string, status = 409): asserts ok {
  if (!ok) throw new ReferralError(status, code);
}
const month = (now: number) =>
  new Date(now + 9 * 3600000).toISOString().slice(0, 7);
export const referralTrialPath = (uid: string) =>
  `camellia_users/${uid}/admin/referral_trial`;
/** Internal foundation. There is no public grant/issue endpoint until signup, cost and dedicated-AI integrations pass. */
export class ReferralService {
  constructor(
    private db: Firestore,
    private auth: Pick<Auth, 'getUser'>,
    private now = Date.now,
  ) {}
  private ref(collection: string, id: string) {
    return this.db.doc(`${SERVER_ROOT}/${collection}/${id}`);
  }
  async issue(uid: string) {
    const identity = await verifiedReferralIdentity(this.db, this.auth, uid),
      owner = await this.db.doc(`camellia_users/${uid}`).get();
    reject(owner.exists, 'PROFILE_REQUIRED', 403);
    const token = randomBytes(32).toString('base64url');
    await this.ref('referral_codes', referralHash(token)).create({
      ownerUid: uid,
      ownerCreatedAt: owner.createTime!.toMillis(),
      identityKeys: identity.keys,
      createdAt: this.now(),
      revoked: false,
    });
    return { token };
  }
  async grant(uid: string, token: unknown) {
    reject(
      typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token),
      'INVALID_REFERRAL',
      400,
    );
    const identity = await verifiedReferralIdentity(this.db, this.auth, uid),
      codeBefore = await this.ref('referral_codes', referralHash(token)).get();
    reject(typeof codeBefore.data()?.ownerUid === 'string', 'INVALID_REFERRAL');
    const referrerIdentity = await verifiedReferralIdentity(
        this.db,
        this.auth,
        codeBefore.data()!.ownerUid,
      ),
      now = this.now(),
      period = month(now),
      ownerRef = this.db.doc(`camellia_users/${uid}`),
      grantRef = this.ref('referral_grants', referralHash(uid));
    return this.db.runTransaction(async (tx) => {
      const [cfg, code, profile, previous, subscription] = await Promise.all([
        tx.get(this.ref('config', 'referral')),
        tx.get(this.ref('referral_codes', referralHash(token))),
        tx.get(ownerRef),
        tx.get(grantRef),
        tx.get(this.db.doc(subscriptionPath(uid))),
      ]);
      // A retried successful grant remains the same after a new-acceptance stop. Never renew its expiry.
      if (previous.exists)
        return {
          granted: true,
          reused: true,
          expiresAt: previous.data()!.expiresAt,
          rewarded: previous.data()!.rewarded,
        };
      const { config } = referralConfiguration(cfg.data());
      reject(config, 'CAMPAIGN_NOT_CONFIGURED', 503);
      reject(
        config.accepting &&
          now >= Date.parse(config.startsAt) &&
          now < Date.parse(config.endsAt),
        'CAMPAIGN_STOPPED',
        503,
      );
      const c = code.data();
      reject(
        c &&
          c.revoked !== true &&
          typeof c.ownerUid === 'string' &&
          c.ownerUid === codeBefore.data()!.ownerUid,
        'INVALID_REFERRAL',
      );
      reject(c.ownerUid !== uid, 'SELF_REFERRAL');
      reject(
        profile.exists &&
          profile.createTime!.toMillis() >= Date.parse(config.startsAt) &&
          identity.createdAt >= Date.parse(config.startsAt) &&
          identity.createdAt <= now,
        'NEW_REGISTRATION_REQUIRED',
        403,
      );
      const referrer = await tx.get(
        this.db.doc(`camellia_users/${c.ownerUid}`),
      );
      reject(
        referrer.exists && referrer.createTime!.toMillis() === c.ownerCreatedAt,
        'INVALID_REFERRAL',
      );
      reject(
        Array.isArray(c.identityKeys) &&
          !identity.keys.some(
            (k) =>
              c.identityKeys.includes(k) || referrerIdentity.keys.includes(k),
          ),
        'SELF_REFERRAL',
      );
      const sub = subscription.data();
      reject(
        !sub ||
          (Date.parse(String(sub.expiresAt)) <= now &&
            config.overlapPolicy === 'reject_active_only'),
        'TRIAL_OVERLAP',
      );
      const identityRefs = identity.keys.map((k) =>
          this.ref('referral_identities', k),
        ),
        identities = await Promise.all(identityRefs.map((r) => tx.get(r)));
      reject(
        identities.every((r) => !r.exists),
        'ALREADY_RECEIVED',
      );
      const budgetRef = this.ref('referral_budgets', period),
        rewardRef = this.ref(
          'referral_rewards',
          `${referralHash(c.ownerUid)}_${period}`,
        ),
        [budget, rewards] = await Promise.all([
          tx.get(budgetRef),
          tx.get(rewardRef),
        ]);
      const reserved = Number(budget.data()?.reservedYen ?? 0),
        rewardCount = Number(rewards.data()?.count ?? 0);
      reject(
        Number.isSafeInteger(reserved) &&
          reserved >= 0 &&
          reserved + config.reservePerTrialYen <= config.monthlyBudgetYen,
        'BUDGET_LIMIT',
        429,
      );
      const rewarded =
        Number.isSafeInteger(rewardCount) &&
        rewardCount >= 0 &&
        rewardCount < REFERRER_MONTHLY_REWARDS;
      reject(
        rewarded || config.newcomerAfterCap === 'grant',
        'REFERRER_MONTHLY_LIMIT',
      );
      const expiresAt = new Date(
          now + REFERRAL_TRIAL_DAYS * 86400000,
        ).toISOString(),
        grant = {
          uidHash: referralHash(uid),
          campaignId: config.campaignId,
          createdAt: new Date(now).toISOString(),
          expiresAt,
          rewarded,
          reservedYen: config.reservePerTrialYen,
          aiLimit: config.trialAiRequests,
          aiUsed: 0,
          aiReservedYen: 0,
          revoked: false,
        };
      tx.create(grantRef, grant);
      identityRefs.forEach((r) =>
        tx.create(r, { grantId: grantRef.id, createdAt: now }),
      );
      tx.set(
        budgetRef,
        { reservedYen: reserved + config.reservePerTrialYen },
        { merge: true },
      );
      tx.set(this.db.doc(referralTrialPath(uid)), {
        source: 'referral_trial',
        status: 'trialing',
        plan: 'plus',
        grantId: grantRef.id,
        startsAt: new Date(now).toISOString(),
        expiresAt,
        aiLimit: config.trialAiRequests,
        aiExpandedReady: false,
      });
      if (rewarded) {
        const creditId = referralHash(`${c.ownerUid}:${uid}`);
        tx.set(rewardRef, { count: rewardCount + 1 }, { merge: true });
        tx.create(
          this.db.doc(
            `camellia_users/${c.ownerUid}/admin/referral_decorations/items/${creditId}`,
          ),
          {
            earnedAt: now,
            claimed: false,
            catalogIds: config.decorationIds,
            permanent: true,
          },
        );
      }
      return { granted: true, reused: false, expiresAt, rewarded };
    });
  }
  async reserveTrialAi(uid: string, requestId: string, maxCostYen: number) {
    reject(
      /^[0-9a-f-]{36}$/i.test(requestId) &&
        Number.isSafeInteger(maxCostYen) &&
        maxCostYen > 0,
      'INVALID_AI_RESERVATION',
      400,
    );
    const grantRef = this.ref('referral_grants', referralHash(uid)),
      receiptRef = this.ref(
        'referral_ai_reservations',
        referralHash(`${uid}:${requestId}`),
      );
    return this.db.runTransaction(async (tx) => {
      const [grant, receipt] = await Promise.all([
        tx.get(grantRef),
        tx.get(receiptRef),
      ]);
      if (receipt.exists) {
        reject(
          receipt.data()?.maxCostYen === maxCostYen,
          'INVALID_AI_RESERVATION',
        );
        return { reserved: true, reused: true };
      }
      const g = grant.data();
      reject(
        g && g.revoked !== true && Date.parse(g.expiresAt) > this.now(),
        'TRIAL_EXPIRED',
        403,
      );
      reject(
        g.aiUsed < g.aiLimit && g.aiReservedYen + maxCostYen <= g.reservedYen,
        'TRIAL_AI_LIMIT',
        429,
      );
      tx.update(grantRef, {
        aiUsed: g.aiUsed + 1,
        aiReservedYen: g.aiReservedYen + maxCostYen,
      });
      tx.create(receiptRef, {
        grantId: grantRef.id,
        maxCostYen,
        createdAt: this.now(),
      });
      return { reserved: true, reused: false };
    });
  }
  async claimDecoration(uid: string, creditId: string, decorationId: string) {
    reject(/^[a-f0-9]{64}$/.test(creditId), 'INVALID_DECORATION', 400);
    const ref = this.db.doc(
      `camellia_users/${uid}/admin/referral_decorations/items/${creditId}`,
    );
    return this.db.runTransaction(async (tx) => {
      const s = await tx.get(ref),
        v = s.data();
      reject(
        v && Array.isArray(v.catalogIds) && v.catalogIds.includes(decorationId),
        'INVALID_DECORATION',
      );
      if (v.claimed) {
        reject(v.decorationId === decorationId, 'DECORATION_ALREADY_CHOSEN');
        return { claimed: true, reused: true };
      }
      tx.update(ref, {
        claimed: true,
        decorationId,
        claimedAt: this.now(),
        permanent: true,
      });
      return { claimed: true, reused: false };
    });
  }
  /** Internal operator action only. A campaign acceptance stop is not this emergency revocation. */
  async revokeTrial(
    uid: string,
    operatorUid: string,
    reason: 'confirmed_fraud' | 'privacy_incident',
  ) {
    reject(
      operatorUid.length > 0 &&
        ['confirmed_fraud', 'privacy_incident'].includes(reason),
      'INVALID_REVOCATION',
      400,
    );
    await this.db.runTransaction(async (tx) => {
      const ref = this.ref('referral_grants', referralHash(uid)),
        g = await tx.get(ref);
      reject(g.exists, 'NOT_FOUND', 404);
      tx.update(ref, { revoked: true });
      tx.create(this.ref('referral_audit', randomBytes(16).toString('hex')), {
        grantId: ref.id,
        operatorUid,
        reason,
        at: this.now(),
      });
    });
  }
  /** Already-priced numeric provider observations only. No refunds of reserved budget and no assumed zero cost. */
  async settleTrialAi(uid: string, requestId: string, actualCostYen: number) {
    reject(
      /^[0-9a-f-]{36}$/i.test(requestId) &&
        Number.isFinite(actualCostYen) &&
        actualCostYen >= 0,
      'INVALID_AI_OBSERVATION',
      400,
    );
    return this.db.runTransaction(async (tx) => {
      const ref = this.ref(
          'referral_ai_reservations',
          referralHash(`${uid}:${requestId}`),
        ),
        receipt = await tx.get(ref),
        r = receipt.data();
      reject(r, 'NOT_FOUND', 404);
      if (r.settled) {
        reject(r.actualCostYen === actualCostYen, 'INVALID_AI_OBSERVATION');
        return { settled: true, reused: true };
      }
      const gref = this.ref('referral_grants', referralHash(uid)),
        grant = await tx.get(gref);
      reject(grant.exists, 'NOT_FOUND', 404);
      const costOverrun = actualCostYen > r.maxCostYen;
      tx.update(ref, { settled: true, actualCostYen, costOverrun });
      tx.update(gref, {
        observedCostYen:
          Number(grant.data()!.observedCostYen ?? 0) + actualCostYen,
        ...(costOverrun ? { costReviewRequired: true } : {}),
      });
      return { settled: true, reused: false, costOverrun };
    });
  }
}
