/** Places in Camellia that are live in this release. In β2, Circle and Place are coming soon: their own
 * screens say so, and actions never send someone there until the place is live. */
export const LIVE_DESTINATIONS: ReadonlySet<'circle' | 'place'> = new Set();
