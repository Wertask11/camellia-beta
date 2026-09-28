import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({
  configFile: false,
  root,
  resolve: { alias: { '@': root } },
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { checkEntryCopy } = await server.ssrLoadModule('/lib/reflection/check-entry.ts');
  const now = new Date('2026-09-28T09:00:00.000Z');
  const check = (offset) => ({
    id: String(offset),
    mood: 3,
    createdAt: new Date(now.getTime() + offset * 86_400_000).toISOString(),
    updatedAt: new Date(now.getTime() + offset * 86_400_000).toISOString(),
  });
  const cases = [
    [[], '今日は、どんな一日？'],
    [[check(-1)], '昨日と今日、何が違う？'],
    [[check(-4)], '今日は、どんな一日？'],
    [[check(-4), check(-2)], '最近の私、どんな感じ？'],
    [[-10, -8, -6, -5, -4, -2, -1].map(check), '今週のあなたに、どんな変化がある？'],
    [[check(-1), check(0)], '今日のあなたを、もう少し見てみる？'],
  ];
  for (const [checks, expected] of cases) {
    const actual = checkEntryCopy(checks, now).title;
    if (actual !== expected)
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${actual}`);
  }
  console.log(`check entry: PASS (${cases.length} cases)`);
} finally {
  await server.close();
}
