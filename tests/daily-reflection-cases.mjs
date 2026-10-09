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
const reflection = await server.ssrLoadModule('/lib/reflection/engine.ts');
const now = new Date('2026-09-19T12:00:00+09:00');
const at = (days, mood = 3, extra = {}) => ({
  id: `c${days}`,
  mood,
  ...extra,
  createdAt: new Date(now.getTime() + days * 86400000).toISOString(),
  updatedAt: new Date(now.getTime() + days * 86400000).toISOString(),
});
const state = (checkins) => ({ checkins });
const results = [];

const first = reflection.buildDailyReflection(state([at(0, 3)]), now);
results.push([
  'first day',
  first.stage === 'first_day' &&
    first.messages.join('').includes('最初の一日') &&
    !first.messages.join('').includes('昨日より'),
  first,
]);

const yesterday = reflection.buildDailyReflection(
  state([
    at(-1, 2, { sleep: 5, body: '普通' }),
    at(0, 4, { sleep: 7, body: '疲れ気味' }),
  ]),
  now,
);
results.push([
  'yesterday compare',
  yesterday.stage === 'yesterday_compare' &&
    yesterday.messages.some((x) => x.includes('昨日より')),
  yesterday,
]);

const recent = reflection.buildDailyReflection(
  state([at(-4, 3), at(-2, 3), at(0, 3)]),
  now,
);
results.push([
  'recent non-consecutive',
  recent.stage === 'recent' &&
    recent.messages.some((x) => x.includes('この3回の記録')),
  recent,
]);

const weeklyChecks = [-9, -7, -6, -4, -2, -1, 0].map((day, i) =>
  at(day, i < 4 ? 3 : 2, {
    sleep: i < 4 ? 7 : 5,
    body: i > 3 ? '疲れ気味' : '普通',
    stress: i > 3 ? 'やや高い' : '普通',
  }),
);
const weekly = reflection.buildDailyReflection(state(weeklyChecks), now);
results.push([
  'weekly real records only',
  weekly.stage === 'weekly' &&
    weekly.historyDays === 7 &&
    weekly.hasWeeklyInsight,
  weekly,
]);

const boundary = new Date('2026-09-18T15:05:00.000Z'); // 2026-09-19 00:05 JST
const boundaryResult = reflection.buildDailyReflection(
  state([{ ...at(0), id: 'boundary', createdAt: '2026-09-18T15:01:00.000Z' }]),
  boundary,
);
results.push([
  'JST boundary',
  boundaryResult?.stage === 'first_day',
  boundaryResult,
]);

const sameDay = reflection.dailyCheckins(
  [
    at(0, 2),
    {
      ...at(0, 4),
      id: 'later',
      createdAt: new Date(now.getTime() + 3600000).toISOString(),
    },
  ],
  new Date(now.getTime() + 7200000),
);
results.push([
  'same-day latest only',
  sameDay.length === 1 && sameDay[0].id === 'later',
  sameDay,
]);

for (const [name, ok, detail] of results)
  console.log(`${name}: ${ok ? 'PASS' : 'FAIL'}`, JSON.stringify(detail));
await server.close();
if (results.some((x) => !x[1])) process.exitCode = 1;
