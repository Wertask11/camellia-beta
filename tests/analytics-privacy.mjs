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
const analytics = await server.ssrLoadModule('/lib/analytics/posthog.ts');
const event = {
  id: 'e',
  name: 'daily_reflection_view',
  properties: {
    reflection_stage: 'weekly',
    history_days: 7,
    name: '秘密の名前',
    nickname: '秘密',
    note: '秘密のメモ',
    checkText: 'つらい',
    sleep: 4,
  },
  createdAt: new Date().toISOString(),
};
const state = { profile: { id: 'anonymous-device' }, analyticsEvents: [event] };
const safe = analytics.sanitizeEventProperties(event, state);
const serialized = JSON.stringify(safe);
const forbidden = ['秘密', 'name', 'nickname', 'note', 'checkText', 'sleep'];
const ok =
  safe.reflection_stage === 'weekly' &&
  safe.history_days === 7 &&
  forbidden.every((x) => !serialized.includes(x));
console.log(`analytics privacy: ${ok ? 'PASS' : 'FAIL'}`, serialized);
await server.close();
if (!ok) process.exitCode = 1;
