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
// Page URLs that PostHog adds itself: a login return must not carry its one-time code or ticket.
const captured = { event: 'login_view', properties: { $current_url: 'https://camellia-beta.vercel.app/?code=LINE_CODE&state=STATE', $session_entry_url: 'https://camellia-beta.vercel.app/?camellia_passport_ticket=TICKET#x', $referrer: '$direct', $pathname: '/', period: 'morning' } };
const scrubbed = JSON.stringify(analytics.scrubUrlProperties(captured));
const urlsOk = !/LINE_CODE|STATE|TICKET/.test(scrubbed) && scrubbed.includes('"$current_url":"https://camellia-beta.vercel.app/"') && scrubbed.includes('"$referrer":"$direct"') && scrubbed.includes('"period":"morning"') && analytics.scrubUrlProperties(null) === null;
console.log(`analytics URL scrub: ${urlsOk ? 'PASS' : 'FAIL'}`, scrubbed);
await server.close();
if (!ok || !urlsOk) process.exitCode = 1;
