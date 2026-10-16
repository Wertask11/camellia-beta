import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const root = process.cwd(),
  server = await createServer({
    configFile: false,
    root,
    resolve: { alias: { '@': root } },
    server: { middlewareMode: true, hmr: false },
  });
try {
  const { validatePlace, safePlaceUrl } = await server.ssrLoadModule(
    '/lib/place/model.ts',
  );
  const draft = {
    slug: 'fixture-only',
    name: '掲載検証用（架空・非公開）',
    category: '本屋',
    region: '福岡県',
    area: '福岡市',
    officialUrl: 'https://example.com/',
  };
  assert.equal(
    validatePlace({ ...draft, status: 'published', uid: 'PRIVATE' }).status,
    undefined,
  );
  for (const url of [
    'javascript:alert(1)',
    'http://example.com/',
    'https://localhost/',
    'https://127.0.0.1/',
    'https://u:p@example.com',
  ])
    assert.throws(() => safePlaceUrl(url));
  assert.throws(() =>
    validatePlace({ ...draft, recommendedFor: ['diagnose'] }),
  );
  assert.throws(() => validatePlace({ ...draft, description: '必ず治る' }));
  assert.equal(validatePlace(draft).partnerStatus, 'none');
  const { sanitizeEventProperties } = await server.ssrLoadModule(
    '/lib/analytics/posthog.ts',
  );
  const { emptyState } = await server.ssrLoadModule(
    '/hooks/useCamelliaStore.ts',
  );
  for (const name of [
    'place_view',
    'place_save',
    'place_external_open',
    'place_booking_open',
    'place_map_open',
  ]) {
    const props = sanitizeEventProperties(
      {
        name,
        id: 'e',
        properties: {
          place_id: 'public-slug',
          mood: 'PRIVATE',
          text: 'PRIVATE',
          name: 'PRIVATE',
          uid: 'PRIVATE',
        },
      },
      emptyState(),
    );
    assert.ok(!JSON.stringify(props).includes('PRIVATE'));
  }
  const { PLACE_DEMO_DATA } = await server.ssrLoadModule('/data/place-demo.ts');
  assert.equal(PLACE_DEMO_DATA.length, 3);
  for (const demo of PLACE_DEMO_DATA) {
    assert.equal(demo.status, 'draft');
    assert.ok(demo.name.includes('デモ'));
    for (const key of ['officialUrl', 'instagramUrl', 'bookingUrl', 'mapUrl'])
      assert.equal(demo[key], '');
    assert.equal(demo.sponsored, false);
    assert.equal(demo.partnerStatus, 'none');
  }
  const {DiscoverScreen} = await server.ssrLoadModule('/screens/DiscoverScreen.tsx');
  const noop=()=>{};
  const html=renderToStaticMarkup(createElement(DiscoverScreen,{state:emptyState(),onCategory:noop,onOpenAction:noop,onOpenSecondary:noop}));
  assert.ok(html.includes('デモを見る'), 'Place demo has a Discover entry while real publishing stays disabled');
  assert.ok(!html.includes('Place（準備中）'));
  console.log(
    'Place validation and privacy boundaries PASS. No real place published.',
  );
} finally {
  await server.close();
}
