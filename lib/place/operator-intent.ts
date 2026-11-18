const KEY = 'camellia-place-operator-login',
  TTL = 10 * 60 * 1000;
export function operatorIntent(
  url: URL,
  storage: Pick<Storage, 'getItem'>,
  now = Date.now(),
) {
  if (url.searchParams.get('open') === 'place-operator') return true;
  if (!['code', 'error'].some((k) => url.searchParams.has(k))) return false;
  try {
    const v = JSON.parse(storage.getItem(KEY) || 'null');
    return (
      v?.purpose === 'place-operator' &&
      typeof v.at === 'number' &&
      now >= v.at &&
      now - v.at < TTL
    );
  } catch {
    return false;
  }
}
export function armOperatorLogin() {
  localStorage.setItem(
    KEY,
    JSON.stringify({ purpose: 'place-operator', at: Date.now() }),
  );
}
export function clearOperatorLogin() {
  try{localStorage.removeItem(KEY);}catch{/* No personal records or authorization depend on this hint. */}
}
