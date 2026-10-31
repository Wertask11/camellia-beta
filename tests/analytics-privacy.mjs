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
const onboardingSession=crypto.randomUUID();
const onboardingSafe=analytics.sanitizeEventProperties({id:'guest-test',name:'guest_check_saved',createdAt:new Date().toISOString(),properties:{entry_flow:'check_first',entry_session:onboardingSession,storage:'device',mood:1,sleep:3,uid:'private-uid',text:'private-check-text'}},{profile:{id:'local-test'},analyticsEvents:[]});
if(onboardingSafe.entry_flow!=='check_first'||onboardingSafe.entry_session!==onboardingSession||onboardingSafe.storage!=='device'||['mood','sleep','uid','text'].some(key=>key in onboardingSafe))throw new Error('guest analytics privacy');
const invalidEntry=analytics.sanitizeAuthEventProperties('login_success',{method:'google',entry_flow:'arbitrary',entry_session:'not-a-session-uid',text:'private'});
if('entry_flow'in invalidEntry||'entry_session'in invalidEntry||'text'in invalidEntry)throw new Error('invalid onboarding metadata');
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
const authCases = [
  {
    name: 'login_success',
    properties: { method: 'google', needs_profile: true, email: 'private@example.com', name: '秘密', uid: 'firebase-uid', token: 'secret-token', code: 'one-time-code' },
    expected: { method: 'google', needs_profile: true },
  },
  {
    name: 'auth_method_selected',
    properties: { method: 'line', auth_method: 'line', email: 'private@example.com', raw_message: '認証エラー秘密' },
    expected: { method: 'line', auth_method: 'line' },
  },
  {
    name: 'login_failure',
    properties: { method: 'google', stage: 'cancelled', reason: 'user_cancelled', token: 'secret-token', raw_message: 'private' },
    expected: { method: 'google', stage: 'cancelled', reason: 'user_cancelled' },
  },
];
const authOk = authCases.every(({ name, properties, expected }) => {
  const sanitized = analytics.sanitizeAuthEventProperties(name, properties);
  return JSON.stringify(sanitized) === JSON.stringify(expected) && !/private|秘密|firebase-uid|secret-token|one-time-code/.test(JSON.stringify(sanitized));
});
console.log(`auth analytics privacy: ${authOk ? 'PASS' : 'FAIL'}`);
await server.close();
if (!ok || !urlsOk || !authOk) process.exitCode = 1;
