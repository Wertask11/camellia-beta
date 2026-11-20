import { schoolParkAuth } from '../schoolpark/firebase';
export type ReferralLink = {
  id: string;
  createdAt: number | null;
  revoked: boolean;
};
export type ReferralHistory = { links: ReferralLink[]; nextCursor?: string };
async function ownerRequest(body: Record<string, unknown>) {
  const user = schoolParkAuth.currentUser;
  if (!user || user.isAnonymous)
    throw new Error('紹介リンクの確認には無料のCamellia IDが必要です。');
  const r = await fetch('/api/camellia/referral', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (schoolParkAuth.currentUser?.uid !== user.uid)
    throw new Error('アカウントが変わりました。画面を開き直してください。');
  if (!r.ok)
    throw new Error(
      '紹介リンクを確認できませんでした。少し時間をおいてお試しください。',
    );
  return (await r.json()) as Record<string, unknown>;
}
export async function referralHistory(
  after?: string,
): Promise<ReferralHistory> {
  const v = await ownerRequest({
    operation: 'history',
    ...(after ? { after } : {}),
  });
  if (
    !Array.isArray(v.links) ||
    v.links.some(
      (x) =>
        !x ||
        typeof x !== 'object' ||
        !/^[a-f0-9]{64}$/.test(x.id) ||
        typeof x.revoked !== 'boolean' ||
        (x.createdAt !== null && typeof x.createdAt !== 'number'),
    ) ||
    (v.nextCursor !== undefined &&
      (typeof v.nextCursor !== 'string' ||
        !/^[a-f0-9]{64}$/.test(v.nextCursor)))
  )
    throw new Error('紹介履歴を確認できませんでした。');
  return v as unknown as ReferralHistory;
}
export async function revokeReferral(id: string) {
  const v = await ownerRequest({ operation: 'revoke', id });
  if (v.revoked !== true) throw new Error('取消を確認できませんでした。');
}
export async function referralStatus() {
  const r = await fetch('/api/camellia/referral', {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  const v = await r.json();
  return (
    r.ok &&
    Boolean(
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      (v as Record<string, unknown>).enabled === true,
    )
  );
}
export async function issueReferral() {
  const user = schoolParkAuth.currentUser;
  if (!user || user.isAnonymous)
    throw new Error('紹介リンクを作るには無料のCamellia IDが必要です。');
  const r = await fetch('/api/camellia/referral', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ operation: 'issue' }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (schoolParkAuth.currentUser?.uid !== user.uid)
    throw new Error('アカウントが変わりました。画面を開き直してください。');
  const v = await r.json();
  if (
    !r.ok ||
    !v ||
    typeof v !== 'object' ||
    Array.isArray(v) ||
    !/^[-A-Za-z0-9_]{43}$/.test(String((v as Record<string, unknown>).token))
  )
    throw new Error(
      '今は紹介リンクを作れません。通常の無料機能はそのまま使えます。',
    );
  const url = new URL('/', location.origin);
  url.searchParams.set(
    'referral',
    String((v as Record<string, unknown>).token),
  );
  return url.href;
}
