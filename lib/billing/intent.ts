/** Navigation hint only. All billing access still requires a verified server token. */
const KEY = 'camellia-billing-login',
  TTL = 10 * 60 * 1000;
export function billingIntent(
  url: URL,
  storage: Pick<Storage, 'getItem'>,
  now = Date.now(),
) {
  if (url.searchParams.get('open') === 'billing') return true;
  if (!['code', 'error'].some((k) => url.searchParams.has(k))) return false;
  try {
    const v = JSON.parse(storage.getItem(KEY) || 'null');
    return (
      v?.purpose === 'billing' &&
      typeof v.at === 'number' &&
      now >= v.at &&
      now - v.at < TTL
    );
  } catch {
    return false;
  }
}
export function armBillingLogin() {
  localStorage.setItem(
    KEY,
    JSON.stringify({ purpose: 'billing', at: Date.now() }),
  );
}
export function clearBillingLogin() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Not an authorization or a personal record. */
  }
}
