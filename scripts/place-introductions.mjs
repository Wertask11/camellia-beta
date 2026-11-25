/**
 * Save the prepared Place "introduction" DRAFTS to Firestore. Dry-run by default; never publishes.
 *   node scripts/place-introductions.mjs data/place-introductions-fukuoka.json          (dry run)
 *   node scripts/place-introductions.mjs data/place-introductions-fukuoka.json --apply  (save drafts)
 * Needs FIREBASE_SERVICE_ACCOUNT_JSON like the other operator scripts. Existing slugs are skipped.
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
const [file, ...flags] = process.argv.slice(2);
if (!file || flags.some((f) => f !== '--apply'))
  throw new Error('Usage: node scripts/place-introductions.mjs <data/place-introductions-*.json> [--apply]');
const apply = flags.includes('--apply');
const { places } = JSON.parse(readFileSync(file, 'utf8'));
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
try {
  const { serverAdmin } = await server.ssrLoadModule('/lib/server/admin.ts'),
    { importIntroductionDrafts } = await server.ssrLoadModule('/lib/place/introduction-drafts.ts');
  const result = await importIntroductionDrafts(serverAdmin().db, places, apply);
  console.log(`${apply ? 'Saved' : 'Would save'} ${result.created.length} drafts; skipped ${result.skipped.length} existing.`);
  if (result.skipped.length) console.log('Skipped:', result.skipped.join(', '));
  if (!apply) console.log('Dry run only. Add --apply to save the drafts.');
} finally {
  await server.close();
}
