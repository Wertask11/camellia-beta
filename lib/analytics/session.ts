const SESSION_KEY = 'camellia-analytics-session-v1';
export const ANALYTICS_SESSION_CHANGED = 'camellia-analytics-session-changed';
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export function analyticsDay(time: number) { return new Date(time + 9 * 3600000).toISOString().slice(0, 10); }
/** Per-tab, pseudonymous profile, 30 minutes idle or JST date boundary. No ID is sent as a property. */
export function analyticsSession(profile: string, now = Date.now()) {
  let previous: { id: string; profile: string; at: number; day: string } | undefined;
  try { previous = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') ?? undefined; } catch { /* recover session metadata only */ }
  const fresh = !previous || previous.profile !== profile || !Number.isFinite(previous.at) || now < previous.at ||
    now - previous.at >= SESSION_IDLE_MS || previous.day !== analyticsDay(now) || typeof previous.id !== 'string';
  const current = fresh ? { id: crypto.randomUUID(), profile, at: now, day: analyticsDay(now) } : { ...previous!, at: now };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(current)); } catch { return { id: '', fresh: false }; }
  return { id: current.id, fresh };
}
export function currentAnalyticsSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')?.id ?? ''; } catch { return ''; }
}

let lastEventTime = 0;
/** Millisecond timestamps preserve app event ordering even within one React commit. */
export function analyticsTimestamp() { lastEventTime = Math.max(Date.now(), lastEventTime + 1); return new Date(lastEventTime).toISOString(); }
