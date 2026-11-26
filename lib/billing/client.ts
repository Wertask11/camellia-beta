import { schoolParkAuth } from '@/lib/schoolpark/firebase';
/** Ask the server for a Stripe-hosted page (checkout or subscription management) and go there. */
export async function openBillingPage(operation: 'checkout' | 'portal') {
  const user = schoolParkAuth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Plusの申し込みには、Camellia IDでのログインが必要です。');
  let url = '',
    code = '';
  try {
    const response = await fetch('/api/camellia/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const body = (await response.json()) as { url?: string; error?: string };
    if (response.ok && typeof body.url === 'string') url = body.url;
    else code = typeof body.error === 'string' ? body.error : '';
  } catch {
    /* handled below */
  }
  if (code === 'ALREADY_PLUS')
    throw new Error('お支払いはすでに完了しています。反映まで少しかかることがあります。もう一度申し込む必要はありません。');
  if (code === 'NO_SUBSCRIPTION') throw new Error('このアカウントには、管理できるお支払いがありません。');
  if (!/^https:\/\/(checkout|billing)\.stripe\.com\//.test(url))
    throw new Error('今は手続きを開けませんでした。少し時間をおいて、もう一度お試しください。');
  location.assign(url);
}
