import { REFERRAL_INTEGRATION_READY } from './config';
import { schoolParkAuth } from '../schoolpark/firebase';
const KEY = 'camellia-referral-registration';
let completing = false;
export function clearPendingReferral() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* No personal record is changed. */
  }
}
let capturePromise:Promise<void>|undefined;
export function captureReferralRegistration(){return capturePromise??=captureRegistration();}
async function captureRegistration() {
  const url = new URL(location.href),
    token = url.searchParams.get('referral');
  if (!token) return;
  url.searchParams.delete('referral');
  history.replaceState({}, '', url.pathname + url.search + url.hash);
  clearPendingReferral();
  if (
    !REFERRAL_INTEGRATION_READY ||
    (schoolParkAuth.currentUser && !schoolParkAuth.currentUser.isAnonymous) ||
    !/^[A-Za-z0-9_-]{43}$/.test(token)
  )
    return;
  try {
    const response = await fetch('/api/camellia/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'capture', token }),
        signal: AbortSignal.timeout(10000),
      }),
      v = (await response.json()) as { intent?: unknown; expiresAt?: unknown };
    if (
      response.ok &&
      typeof v.intent === 'string' &&
      typeof v.expiresAt === 'string' &&
      Number.isFinite(Date.parse(v.expiresAt))
    )
      localStorage.setItem(
        KEY,
        JSON.stringify({ token, intent: v.intent, expiresAt: v.expiresAt }),
      );
  } catch {
    /* Do not interrupt Check-first onboarding. */
  }
}
/** Called after the first successful account sync. No private content or client-created account timestamp. */
export async function completePendingReferral(uid: string) {
  if (!REFERRAL_INTEGRATION_READY || completing) return;
  let pending;
  try {
    pending = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    clearPendingReferral();
    return;
  }
  if (!pending) return;
  if (
    typeof pending.token !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(pending.token) ||
    typeof pending.intent !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(pending.intent) ||
    typeof pending.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(pending.expiresAt))
  ) {
    clearPendingReferral();
    return;
  }
  if (
    Date.parse(pending.expiresAt) <= Date.now() ||
    (pending.uid && pending.uid !== uid)
  ) {
    clearPendingReferral();
    return;
  }
  const user = schoolParkAuth.currentUser;
  if (!user || user.isAnonymous || user.uid !== uid) return;
  completing = true;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...pending, uid }));
    const token = await user.getIdToken();
    if (schoolParkAuth.currentUser?.uid !== uid) return;
    const response = await fetch('/api/camellia/referral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        operation: 'complete',
        token: pending.token,
        intent: pending.intent,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok || [400, 403, 404, 409].includes(response.status)) {
      const current = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (current?.intent === pending.intent && current.uid === uid)
        clearPendingReferral();
    }
  } catch {
    /* Retry only after another successful sync, within the same intent expiry. */
  } finally {
    completing = false;
  }
}
