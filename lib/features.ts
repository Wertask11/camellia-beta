/** Places in Camellia that are live in this release. In β2, Circle and Place are coming soon: their own
 * screens say so, and actions never send someone there until the place is live. */
export const LIVE_DESTINATIONS: ReadonlySet<'circle' | 'place'> = new Set();

/* UI switches for the Today one-flow release (Camellia β2 UI/UX audit, 2026-10-09).
   Both are on by default. Setting VITE_TODAY_ONE_FLOW=off (or VITE_ADAPTIVE_STAGE_UI=off) at build time
   brings back the previous screens. Nothing here changes saved data or analytics events. */
const env = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
const on = (value: string | boolean | undefined) => !['off', 'false', '0'].includes(String(value ?? '').toLowerCase());

/** Today as one numbered flow: Check → 1/3 今日のあなた → 2/3 今日の過ごし方 → 3/3 今日の一枚 → 今日どうする？ → 明日のCamellia. */
export const TODAY_ONE_FLOW = on(env.VITE_TODAY_ONE_FLOW);
/** Copy that follows the person's own record stage (first_day / yesterday_compare / recent / weekly). Never age. */
export const ADAPTIVE_STAGE_UI = on(env.VITE_ADAPTIVE_STAGE_UI);
