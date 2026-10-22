declare const __CAMELLIA_ANALYTICS_DIAGNOSTICS__: boolean;
/** Compile-time disabled in Production. Read-only, bounded, contains no IDs, tokens or content. */
const enabled = typeof __CAMELLIA_ANALYTICS_DIAGNOSTICS__ !== 'undefined' && __CAMELLIA_ANALYTICS_DIAGNOSTICS__;
const entries: Array<{ event: string; status: string; at: string }> = [];
let projectHost = '';
export function analyticsDiagnostic(event: string, status: string, host?: string) {
  if (!enabled || typeof window === 'undefined') return;
  if (host) projectHost = host;
  entries.push({ event, status, at: new Date().toISOString() });
  if (entries.length > 100) entries.shift();
  Object.defineProperty(window, '__CAMELLIA_ANALYTICS_DEBUG__', { configurable: true, get: () => ({
    host: projectHost, app_version: 'beta-v3', event_schema: 1, entries: entries.map(entry => ({ ...entry })),
  }) });
}
