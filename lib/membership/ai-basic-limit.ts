import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import { FREE_DAILY_LIMIT, dailyLimitError, freeDay, freeDayEnd } from '../free/access.js';
import { memberStatus } from './server.js';
/**
 * The Free plan's 30 AI replies a day (owner decision 2026-11-16) also applies after login.
 * Plus (paid, trial or referral) keeps its current access; its own allowance is not decided yet.
 * Counted per account and JST day, so switching style or thread does not reset it.
 */
export async function takeMemberFreeDaily(db: Firestore, uid: string, now = Date.now()) {
  if ((await memberStatus(db, uid, now)).plan === 'plus') return true;
  const owner = createHash('sha256').update(uid).digest('hex'),
    day = freeDay(now),
    ref = db.doc(`${SERVER_ROOT}/member_free_chat_days/${owner}-${day}`);
  try {
    return await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref),
        count = Number(snapshot.data()?.count ?? 0);
      if (!Number.isSafeInteger(count) || count < 0) return false;
      if (count >= FREE_DAILY_LIMIT) throw dailyLimitError();
      tx.set(ref, { count: count + 1, createdAt: snapshot.data()?.createdAt ?? new Date(now), expiresAt: new Date(freeDayEnd(now)) });
      return true;
    });
  } catch (error) {
    // A contended reservation is not available capacity (same as the guest counter).
    if (error && typeof error === 'object' && 'code' in error && (error.code === 10 || error.code === 'ABORTED')) return false;
    throw error;
  }
}
