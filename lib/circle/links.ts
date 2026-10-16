import { CIRCLES } from './catalog';
const KEY = 'camellia-pending-circle';
const TTL = 30 * 60_000;
export function circleLinkIntent(url: string) {
  const value = new URL(url);
  if (value.searchParams.get('open') !== 'circle') return undefined;
  const circle = value.searchParams.get('circle');
  return {
    id: CIRCLES.find((c) => c.id === circle)?.id,
    joinedOnly: value.searchParams.get('joined') === '1',
  };
}
/** Store only public slugs. Auth providers always return to the registered root callback. */
export function readCircleIntent() {
  if (typeof window === 'undefined') return undefined;
  const direct = circleLinkIntent(location.href);
  try {
    if (direct) {
      localStorage.setItem(KEY, JSON.stringify({ ...direct, at: Date.now() }));
      return direct;
    }
    const pending = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (
      pending &&
      typeof pending.at === 'number' &&
      Date.now() - pending.at < TTL &&
      Date.now() >= pending.at
    )
      return {
        id: CIRCLES.find((c) => c.id === pending.id)?.id,
        joinedOnly: pending.joinedOnly === true,
      };
    localStorage.removeItem(KEY);
  } catch {
    /* No storage access: the direct link still works in this tab. */
  }
  return direct;
}
export function clearCircleIntent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Navigation works without persistence. */
  }
}
export function setCircleUrl(id?: string) {
  const url = new URL(location.href);
  url.searchParams.set('open', 'circle');
  url.searchParams.delete('joined');
  if (id && CIRCLES.some((c) => c.id === id))
    url.searchParams.set('circle', id);
  else url.searchParams.delete('circle');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
export function clearCircleUrl() {
  const url = new URL(location.href);
  ['open', 'circle', 'joined'].forEach((key) => url.searchParams.delete(key));
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  clearCircleIntent();
}
