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
  const { generateInsights } = await server.ssrLoadModule(
    '/lib/insight/engine.ts',
  );
  const { emptyState } = await server.ssrLoadModule(
    '/hooks/useCamelliaStore.ts',
  );
  const { treeOverview } = await server.ssrLoadModule('/lib/tree/overview.ts');
  const now = new Date('2026-10-16T12:00:00+09:00'),
    state = emptyState();
  assert.deepEqual(generateInsights(state, now), []);
  state.checkins = [0, 1, 2].map((d) => ({
    id: String(d),
    mood: 3,
    sleep: 5,
    createdAt: new Date(+now - d * 86400000).toISOString(),
  }));
  assert.deepEqual(generateInsights(state, now), []);
  state.checkins.push({
    id: 'four',
    mood: 3,
    sleep: 7,
    createdAt: new Date(+now - 3 * 86400000).toISOString(),
  });
  const insight = generateInsights(state, now).find(
    (i) => i.key === 'sleep-records',
  );
  assert.equal(insight.sampleSize, 4);
  assert.match(insight.fact, /3日/);
  assert.equal(insight.periodStart, '2026-10-13');
  assert.equal(insight.periodEnd, '2026-10-16');
  assert.ok(!/治る|だから/.test(insight.text));
  state.checkins.push({
    id: 'future',
    mood: 5,
    sleep: 1,
    createdAt: new Date(+now + 86400000).toISOString(),
  });
  assert.equal(
    generateInsights(state, now).find((i) => i.key === 'sleep-records')
      .sampleSize,
    4,
  );
  state.insightFeedback = [
    {
      insightKey: 'sleep-records',
      verdict: 'incorrect',
      createdAt: '2026-10-16T03:00:00Z',
    },
  ];
  assert.ok(
    !generateInsights(state, now).some((i) => i.key === 'sleep-records'),
  );
  const leaf = {
    id: 'one',
    name: 'PRIVATE',
    status: 'active',
    meaningTags: ['calming'],
    reflections: [{ id: 'r', text: 'PRIVATE', createdAt: now.toISOString() }],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const overview = treeOverview(
    [leaf, { ...leaf, id: 'deleted', status: 'removed' }],
    now,
  );
  assert.equal(overview.recentAdded.length, 1);
  assert.equal(overview.reflected.length, 1);
  assert.equal(overview.tags.length, 0);
  console.log(
    'Reflection v2 PASS: minimum data, exact facts/period, future exclusion, feedback, no deleted leaf or scoring.',
  );
} finally {
  await server.close();
}
