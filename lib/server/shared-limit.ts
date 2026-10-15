import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from './admin.js';

const positive = (value: string | undefined, fallback: number) =>
  /^\d+$/.test(value ?? '') && Number(value) > 0
    ? Math.min(Number(value), 1_000_000)
    : fallback;
export function rateLimitConfig(env: Record<string, string | undefined>) {
  return {
    user: positive(env.CAMELLIA_CHAT_RATE_USER, 20),
    global: positive(env.CAMELLIA_CHAT_RATE_GLOBAL, 1000),
    windowMs: positive(env.CAMELLIA_CHAT_RATE_WINDOW_SECONDS, 300) * 1000,
  };
}
/** Both user and global reservations occur in a single Firestore serializable transaction. */
export function createSharedRateLimiter(
  db: Firestore,
  env: Record<string, string | undefined> = process.env,
  now = Date.now,
) {
  const config = rateLimitConfig(env);
  return {
    async take(uid: string) {
      const time = now(),
        window = Math.floor(time / config.windowMs);
      const userKey = createHash('sha256').update(uid).digest('hex');
      const refs = [
        db.doc(`${SERVER_ROOT}/rate_windows/user-${userKey}-${window}`),
        db.doc(`${SERVER_ROOT}/rate_windows/global-${window}`),
      ];
      return db.runTransaction(async (tx) => {
        const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
        const counts = snapshots.map((snapshot) =>
          Number(snapshot.data()?.count ?? 0),
        );
        if (counts[0] >= config.user || counts[1] >= config.global)
          return false;
        refs.forEach((ref, index) =>
          tx.set(ref, {
            count: counts[index] + 1,
            expiresAt: new Date((window + 2) * config.windowMs),
          }),
        );
        return true;
      });
    },
  };
}
