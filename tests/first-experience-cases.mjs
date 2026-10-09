import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});
try {
  const { emptyState } = await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
  const { buildDailyReflection } = await server.ssrLoadModule('/lib/reflection/engine.ts');
  const { conversationStarters } = await server.ssrLoadModule('/lib/conversation/starters.ts');
  const { buildCamelliaContext } = await server.ssrLoadModule('/lib/conversation/context.ts');
  const { RuleBasedProcessor } = await server.ssrLoadModule('/lib/conversation/engine.ts');
  const { sanitizeEventProperties } = await server.ssrLoadModule('/lib/analytics/posthog.ts');
  const { TodayScreen } = await server.ssrLoadModule('/screens/TodayScreen.tsx');
  const now=new Date('2026-10-09T12:00:00+09:00');
  const check=(offset,mood=3,extras={})=>({id:`c${offset}`,mood,...extras,createdAt:new Date(now.getTime()+offset*86400000).toISOString(),updatedAt:now.toISOString()});
  const state=emptyState();
  assert.equal(conversationStarters(state,now).length,3);
  assert.ok(!conversationStarters(state,now).some(s=>s.id==='check'));
  state.checkins=[check(-1),check(1)];
  assert.ok(!conversationStarters(state,now).some(s=>s.id==='check'),'yesterday/future cannot appear as today');
  state.checkins=[check(0,2)];
  assert.equal(conversationStarters(state,now)[0].id,'check');
  assert.ok(!conversationStarters(state,now,true).some(s=>s.id==='check'),'relationship context keeps its own topic');
  const original=JSON.stringify(state);
  const response=RuleBasedProcessor.respond('今日のCheckについて話したい',buildCamelliaContext(state,[],[],now));
  assert.match(response.text,/「少しつらい」を選んで/);
  assert.equal(response.showAction,false);
  assert.equal(JSON.stringify(state),original,'structured Check remains separate from Memory');
  state.checkins=[];
  assert.match(RuleBasedProcessor.respond('今日のCheckについて話したい',buildCamelliaContext(state,[],[],now)).text,/まだCheckの記録がありません/);
  for (const offsets of [[-1,0],[-2,-1,0],[-6,-5,-4,-3,-2,-1,0]]) {
    state.checkins=offsets.map(d=>check(d,d===0?4:2,d===0?{sleep:7}:{}));
    const result=buildDailyReflection(state,now);
    assert.match(result.yesterdayMessages[0],/昨日より/,'yesterday comparison persists into recent/7-record stages');
    assert.equal(result.yesterdayMessages.length,1,'missing yesterday sleep is never inferred');
    assert.ok(!result.messages.join('').includes('今週'),'seven stored records do not imply a calendar week');
  }
  state.checkins=[check(-3),check(0)];
  assert.deepEqual(buildDailyReflection(state,now).yesterdayMessages,[]);
  state.checkins=[check(0)];
  assert.match(buildDailyReflection(state,now).messages.join(''),/明日のあなたを知る手がかり/);
  const sensitive={starter_id:'check',text:'PRIVATE_TEXT',name:'PRIVATE_NAME',mood:2,sleep:4};
  const safe=sanitizeEventProperties({id:'event',name:'conversation_starter_selected',properties:sensitive},state);
  assert.equal(safe.starter_id,'check');
  assert.ok(!/PRIVATE|mood|sleep/.test(JSON.stringify(safe)));
  const malicious=sanitizeEventProperties({id:'event',name:'conversation_starter_selected',properties:{starter_id:'PRIVATE_TEXT'}},state);
  assert.equal(malicious.starter_id,undefined);
  const noop=()=>{};
  state.checkins=[check(0)]; // Render with real current time below, independent of fixture date.
  state.checkins[0].createdAt=new Date().toISOString();
  const html=renderToStaticMarkup(createElement(TodayScreen,{state,recommendations:[],onCheckView:noop,onCheckStart:noop,onCheckin:noop,onOpenAction:noop,onIntent:noop,onTalk:noop,onFortune:noop,onTree:noop,onComplete:noop,onFeedback:noop,onProposals:noop,onTrack:noop}));
  assert.ok(html.indexOf('id="today-result"')<html.indexOf('id="today-plans"'));
  assert.ok(html.indexOf('id="today-plans"')<html.indexOf('class="daily-bridges"'));
  assert.ok(html.indexOf('class="daily-bridges"')<html.indexOf('id="today-intent"'));
  assert.ok(!html.includes('aria-label="普通"'),'Check form folds only after today exists');
  console.log('First experience: PASS (3 bounded starters, real JST Check context, no Memory mutation, yesterday across stages, no inferred data/week, analytics allowlist, optional result→plans→card→intent flow).');
} finally { await server.close(); }
