import { schoolParkAuth } from '../schoolpark/firebase';
export type PushStatus = { deliveryReady: boolean; vapidPublicKey?: string };
async function authHeaders() {
  const user = schoolParkAuth.currentUser;
  if (!user || user.isAnonymous) return undefined;
  return { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' };
}
export async function pushStatus(): Promise<PushStatus> {
  const headers = await authHeaders();
  if (!headers) return { deliveryReady: false };
  try {
    const response = await fetch('/api/camellia/notification-settings', { headers, signal: AbortSignal.timeout(10000) });
    const v = (await response.json()) as Record<string, unknown>;
    return response.ok && v.deliveryReady === true && typeof v.vapidPublicKey === 'string'
      ? { deliveryReady: true, vapidPublicKey: v.vapidPublicKey }
      : { deliveryReady: false };
  } catch {
    return { deliveryReady: false };
  }
}
export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
}
/** Must be called from a button press. Asks the browser for permission, subscribes and tells the server. */
export async function enablePushOnThisDevice(vapidPublicKey: string) {
  if (!pushSupported()) throw new Error('この端末やブラウザでは通知を受け取れません。iPhoneはホーム画面に追加したCamelliaから設定してください。');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('通知が許可されませんでした。端末の設定から変更できます。');
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const key = Uint8Array.from(atob(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
  const headers = await authHeaders();
  if (!headers) throw new Error('ログインしてください。');
  const response = await fetch('/api/camellia/notification-settings', { method: 'POST', headers, body: JSON.stringify({ operation: 'register', endpoint: subscription.endpoint }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('通知の登録ができませんでした。少し時間をおいて試してください。');
}
