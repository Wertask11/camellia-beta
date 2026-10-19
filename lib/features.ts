/** Public destination switches. Publication still requires owner-approved acceptance. */
declare const __CAMELLIA_CIRCLE_ENABLED__: boolean;
// Vite emits the same Circle publication decision as the server switch. Legacy
// VITE_ fallback supports isolated fixtures/local tooling without this build config.
const circleEnabled = typeof __CAMELLIA_CIRCLE_ENABLED__ === 'boolean'
  ? __CAMELLIA_CIRCLE_ENABLED__
  : import.meta.env?.VITE_CIRCLE_ENABLED === 'true';
export const LIVE_DESTINATIONS: ReadonlySet<'circle' | 'place'> = new Set([...(circleEnabled ? ['circle' as const] : []),...(import.meta.env?.VITE_PLACE_ENABLED === 'true' ? ['place' as const] : [])]);

/* UI switches for the Today one-flow release (Camellia β2 UI/UX audit, 2026-10-09).
   Both are on by default. Setting VITE_TODAY_ONE_FLOW=off (or VITE_ADAPTIVE_STAGE_UI=off) at build time
   brings back the previous screens. Nothing here changes saved data or analytics events. */
const env = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
const on = (value: string | boolean | undefined) => !['off', 'false', '0'].includes(String(value ?? '').toLowerCase());

/** Today as one numbered flow: Check → 1/3 今日のあなた → 2/3 今日の過ごし方 → 3/3 今日の一枚 → 今日どうする？ → 明日のCamellia. */
export const TODAY_ONE_FLOW = on(env.VITE_TODAY_ONE_FLOW);
/** Copy that follows the person's own record stage (first_day / yesterday_compare / recent / weekly). Never age. */
export const ADAPTIVE_STAGE_UI = on(env.VITE_ADAPTIVE_STAGE_UI);
