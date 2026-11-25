/**
 * Save the prepared Place introductions to Firestore. Dry-run by default.
 * Checked entries (ready) are published with their source; the rest become drafts. Existing places are skipped.
 *   node scripts/place-introductions.mjs            (dry run)
 *   node scripts/place-introductions.mjs --apply    (write)
 * Needs FIREBASE_SERVICE_ACCOUNT_JSON like the other operator scripts. Production normally runs this
 * automatically once via CAMELLIA_PLACE_INTRODUCTION_BATCH (see docs/release-setup-ja.md).
 */
import { createServer } from 'vite';
const flags = process.argv.slice(2);
if (flags.some((f) => f !== '--apply')) throw new Error('Usage: node scripts/place-introductions.mjs [--apply]');
const apply = flags.includes('--apply');
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
try {
  const { serverAdmin } = await server.ssrLoadModule('/lib/server/admin.ts'),
    { importIntroductions } = await server.ssrLoadModule('/lib/place/introduction-drafts.ts'),
    { PLACE_INTRODUCTIONS_FUKUOKA } = await server.ssrLoadModule('/data/place-introductions-fukuoka.ts');
  const r = await importIntroductions(serverAdmin().db, PLACE_INTRODUCTIONS_FUKUOKA, apply);
  console.log(`${apply ? '' : '(dry run) '}published ${r.published.length}, drafts ${r.drafted.length}, skipped existing ${r.skipped.length}`);
  if (!apply) console.log('Add --apply to write.');
} finally {
  await server.close();
}
