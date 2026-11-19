import { createHash, createHmac } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
export const referralHash = (v: string) =>
  createHash('sha256').update(v).digest('hex');
export function referralEmailKey(email: string, key = process.env.CAMELLIA_REFERRAL_IDENTITY_HMAC_KEY) {
  if (!/^[a-f0-9]{64}$/i.test(key ?? '') || !email.trim() || email.length > 320) return;
  return referralHash(`email:verified:v1:${createHmac('sha256', Buffer.from(key!, 'hex')).update(email.trim().toLowerCase()).digest('hex')}`);
}
/** Only Admin Auth and the backend-owned identity map; never accept client provider claims. */
export async function verifiedReferralIdentity(
  db: Firestore,
  auth: Pick<Auth, 'getUser'>,
  uid: string,
) {
  const account = await auth.getUser(uid);
  if (account.disabled) throw new Error('INVALID_IDENTITY');
  const createdAt = Date.parse(account.metadata.creationTime);
  if (!Number.isFinite(createdAt)) throw new Error('INVALID_IDENTITY');
  const keys = [referralHash(`firebase:${uid}`)];
  if (account.emailVerified === true && typeof account.email === 'string') {
    const emailKey = referralEmailKey(account.email);
    if (emailKey) keys.push(emailKey);
  }
  for (const provider of account.providerData)
    if (provider.providerId === 'google.com' && provider.uid)
      keys.push(referralHash(`google:subject:${referralHash(provider.uid)}`));
  const linked = await db
    .collection('camellia_auth_identities')
    .where('camelliaUid', '==', uid)
    .limit(21)
    .get();
  if (linked.size > 20) throw new Error('IDENTITY_REVIEW_REQUIRED');
  for (const doc of linked.docs) {
    const v = doc.data();
    if (
      typeof v.provider === 'string' &&
      ['line', 'google'].includes(v.provider) &&
      typeof v.subjectHash === 'string' &&
      /^[a-f0-9]{64}$/.test(v.subjectHash)
    )
      keys.push(referralHash(`${v.provider}:subject:${v.subjectHash}`));
  }
  if (keys.length === 1) throw new Error('IDENTITY_REVIEW_REQUIRED');
  return { createdAt, keys: [...new Set(keys)] };
}
