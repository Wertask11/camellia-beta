/** True only the first time in this browser session (survives StrictMode's double effects and reloads).
 * Used for view events that must be counted once, such as profile_view. */
export function firstInSession(key: string) {
  try {
    if (sessionStorage.getItem(key) === '1') return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}
