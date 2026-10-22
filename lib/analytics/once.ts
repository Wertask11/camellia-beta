import { currentAnalyticsSession } from './session';
/** One view per semantic session, including reload and StrictMode. */
export function firstInSession(key: string) {
  try {
    const marker = currentAnalyticsSession() || 'pre-session';
    if (sessionStorage.getItem(key) === marker) return false;
    sessionStorage.setItem(key, marker);
    return true;
  } catch { return false; }
}
