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
    [[], '今日の私は、どんな感じ？'],
    [[check(-1)], '昨日と今日、何が違う？'],
    [[check(-4)], '今日の私は、どんな感じ？'],
    [[check(-4), check(-2)], '最近の私、どんな感じ？'],
    [[-10, -8, -6, -5, -4, -2, -1].map(check), '最近のあなたに、どんな変化がある？'],
    [[check(-1), check(0)], '今日のあなたを、もう少し見てみる？'],
  ];
  for (const [checks, expected] of cases) {
    const actual = checkEntryCopy(checks, now).title;
    if (actual !== expected)
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${actual}`);
  }
  // Same-day duplicates and future records cannot manufacture history.
  const duplicated = Array.from({length:7}, (_,i)=>({...check(-2),id:String(i)}));
  if (checkEntryCopy(duplicated, now).title.includes('変化')) throw new Error('Duplicate day counted as seven days');
  if (checkEntryCopy([check(1)], now).title !== cases[0][1]) throw new Error('Future record counted');
  const boundary = new Date('2026-09-28T15:00:00.000Z');
  const previous = {...check(0),createdAt:'2026-09-28T14:59:59.000Z'};
  if (checkEntryCopy([previous], boundary).title !== '昨日と今日、何が違う？') throw new Error('JST yesterday boundary');
  console.log(`check entry: PASS (${cases.length} cases)`);
} finally {
  await server.close();
}
