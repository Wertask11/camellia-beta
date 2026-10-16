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
  const { circleLinkIntent } = await server.ssrLoadModule(
    '/lib/circle/links.ts',
  );
  assert.deepEqual(
    circleLinkIntent(
      'https://example.com/?open=circle&circle=tired&token=private',
    ),
    { id: 'tired', joinedOnly: false },
  );
  assert.deepEqual(
    circleLinkIntent(
      'https://example.com/?open=circle&circle=../../private&joined=1',
    ),
    { id: undefined, joinedOnly: true },
  );
  assert.equal(circleLinkIntent('https://example.com/?open=place'), undefined);
  const { sanitizeEventProperties } = await server.ssrLoadModule(
    '/lib/analytics/posthog.ts',
  );
  const { emptyState } = await server.ssrLoadModule(
    '/hooks/useCamelliaStore.ts',
  );
  for (const days of [0, 1, 7, 90])
    assert.equal(
      sanitizeEventProperties(
        {
          id: 'a',
          name: 'circle_view',
          properties: {
            circle_id: 'tired',
            days_since_join: days,
            text: 'PRIVATE',
            uid: 'PRIVATE',
          },
        },
        emptyState(),
      ).days_since_join,
      days,
    );
  assert.equal(
    sanitizeEventProperties(
      {
        id: 'a',
        name: 'circle_view',
        properties: { days_since_join: 'PRIVATE' },
      },
      emptyState(),
    ).days_since_join,
    undefined,
  );
  console.log(
    'Circle links and retention: PASS (allowlisted slugs; no secrets, bounded D1/D7 properties)',
  );
} finally {
  await server.close();
}
