const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
const storageKey = 'camellia-session-attribution';
export function sanitizeAttribution(source: Record<string, unknown>) {
  const safe: Record<string, string> = {};
  for (const key of keys) {
    const value = source[key];
    // Campaign labels only: no prose, URLs, email addresses or phone numbers.
    if (typeof value === 'string' && /^[a-z][a-z0-9_-]{0,63}$/i.test(value) && !/\d{7}/.test(value))
      safe[key] = value.toLowerCase();
  }
  return safe;
}
export function sessionAttribution() {
  if (typeof window === 'undefined') return {};
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) return sanitizeAttribution(JSON.parse(saved));
    const params = new URLSearchParams(window.location.search);
    const safe = sanitizeAttribution(Object.fromEntries(keys.map(key => [key, params.get(key)])));
    sessionStorage.setItem(storageKey, JSON.stringify(safe));
    return safe;
  } catch { return {}; }
}
