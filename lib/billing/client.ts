import { schoolParkAuth } from '@/lib/schoolpark/firebase';
/** Ask the server for a Stripe-hosted page (checkout or subscription management) and go there. */
export async function openBillingPage(operation: 'checkout' | 'portal') {
  const user = schoolParkAuth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Plusの申し込みには、Camellia IDでのログインが必要です。');
  let url = '';
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
  } catch {
    /* handled below */
  }
  if (!/^https:\/\/(checkout|billing)\.stripe\.com\//.test(url))
    throw new Error('今は手続きを開けませんでした。少し時間をおいて、もう一度お試しください。');
  location.assign(url);
}
