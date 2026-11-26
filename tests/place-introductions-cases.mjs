import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, root: process.cwd(), resolve: { alias: { '@': process.cwd() } }, server: { middlewareMode: true, hmr: false } });
try {
  const { introductionDraft, publishable } = await server.ssrLoadModule('/lib/place/introduction-drafts.ts');
  const { PLACE_INTRODUCTIONS_FUKUOKA: places } = await server.ssrLoadModule('/data/place-introductions-fukuoka.ts');
  assert.equal(places.length, 26, 'all 26 approved candidates');
  assert.equal(new Set(places.map((p) => p.slug)).size, places.length, 'slugs are unique');
  for (const p of places) {
    const d = introductionDraft(p);
    assert.equal(d.listingType, 'introduction', p.slug);
    assert.deepEqual(d.imageUrls, [], `${p.slug}: introductions have no photos`);
    assert.equal(d.partnerStatus, 'none');
    assert.equal(d.sponsored, false);
    assert.ok(!('check' in d) && !('ready' in d) && !('sourceEvidence' in d), 'operator notes are not stored on the place');
    assert.equal(publishable(p), p.ready === true, `${p.slug}: only checked places are published`);
    if (p.ready) assert.match(p.sourceEvidence, /https:\/\/\S+/, `${p.slug}: source recorded`);
  }
  assert.ok(places.filter(publishable).length >= 14, 'the first 14 stay published');
  assert.equal(publishable({ ...places.find((p) => p.ready), address: '' }), false, 'no address, no publishing');
  assert.throws(() => introductionDraft({ ...places[0], name: '〇〇クリニック' }), /INVALID_PLACE/, 'medical places are refused');
  console.log('place introductions: ok');
} finally {
  await server.close();
}
