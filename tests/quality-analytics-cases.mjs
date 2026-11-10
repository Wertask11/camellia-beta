import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  resolve: { alias: { '@': process.cwd() } },
  server: { middlewareMode: true, hmr: false },
});
try {
  const { sanitizeEventProperties, scrubUrlProperties } =
      await server.ssrLoadModule('/lib/analytics/posthog.ts'),
    { emptyState } = await server.ssrLoadModule('/hooks/useCamelliaStore.ts'),
    { QUALITY_KPIS } = await server.ssrLoadModule(
      '/lib/analytics/quality-kpis.ts',
    );
  for (const name of [
    'experience_feedback',
    'circle_place_open',
    'place_contact_open',
    'guest_choices_saved',
  ]) {
    const safe = sanitizeEventProperties(
      {
        name,
        id: 'local',
        properties: {
          value: 'helpful',
          experience_status: 'self_reported',
          catalog: 'published',
          circle_id: 'interests',
          place_id: 'public-place',
          entry_flow: 'explore_first',
          text: 'PRIVATE',
          name: 'PRIVATE',
          uid: 'PRIVATE',
          memory: 'PRIVATE',
          check: { mood: 'PRIVATE' },
          referral_code: 'PRIVATE',
          notification_body: 'PRIVATE',
        },
      },
      emptyState(),
    );
    assert.ok(!JSON.stringify(safe).includes('PRIVATE'));
    assert.ok(!Object.hasOwn(safe, 'referral_code'));
  }
  assert.equal(
    sanitizeEventProperties(
      {
        name: 'experience_feedback',
        id: 'local',
        properties: { value: 'yes' },
      },
      emptyState(),
    ).value,
    undefined,
  );
  assert.equal(
    sanitizeEventProperties(
      {
        name: 'fortune_reflect',
        id: 'local',
        properties: { value: 'helpful' },
      },
      emptyState(),
    ).value,
    undefined,
  );
  assert.equal(
    scrubUrlProperties({
      properties: {
        $current_url: 'https://example.org/?open=partner-share#SECRET',
      },
    }).properties.$current_url,
    'https://example.org/',
  );
  assert.deepEqual(QUALITY_KPIS.retention.days, [7, 30]);
  assert.ok(!QUALITY_KPIS.discovery.includes('check_complete'));
  assert.ok(QUALITY_KPIS.plus.includes('plus_complete'));
  console.log(
    'PASS fixed value enums, private body/name/Check/Memory/referral exclusion, URL secret stripping, optional Check funnel and D7/D30 definitions. Not cloud ingestion or measured retention.',
  );
} finally {
  await server.close();
}
