import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, root: process.cwd(), resolve: { alias: { '@': process.cwd() } }, server: { middlewareMode: true, hmr: false } });
try {
  const { introductionDraft } = await server.ssrLoadModule('/lib/place/introduction-drafts.ts');
  const { places } = JSON.parse(readFileSync('data/place-introductions-fukuoka.json', 'utf8'));
  assert.equal(places.length, 26);
  assert.equal(new Set(places.map((p) => p.slug)).size, places.length, 'slugs are unique');
  for (const p of places) {
    const d = introductionDraft(p);
    assert.equal(d.listingType, 'introduction', p.slug);
    assert.deepEqual(d.imageUrls, [], `${p.slug}: introductions have no photos`);
    assert.equal(d.partnerStatus, 'none');
    assert.equal(d.sponsored, false);
    assert.equal(d.officialUrl, '', `${p.slug}: official URL is added by the operator after checking`);
    assert.ok(d.shortDescription && d.description && d.recommendedFor.length, p.slug);
    assert.ok(!('check' in d), 'review notes are not stored');
  }
  assert.throws(() => introductionDraft({ ...places[0], name: '〇〇クリニック' }), /INVALID_PLACE/, 'medical places are refused');
  console.log('place introduction drafts: ok');
} finally {
  await server.close();
}
