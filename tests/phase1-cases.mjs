import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});
let count=0;const check=(name,fn)=>{fn();count++;console.log(`PASS ${name}`);};
try{
 const {ACTIONS}=await server.ssrLoadModule('/data/actions.ts');
 const {buildDailyReflection}=await server.ssrLoadModule('/lib/reflection/engine.ts');
 const {reflectionHeading,todayPlans}=await server.ssrLoadModule('/lib/today/flow.ts');
 const {recommend}=await server.ssrLoadModule('/lib/recommendation/engine.ts');
 const {emptyState}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 const {sanitizeEventProperties}=await server.ssrLoadModule('/lib/analytics/posthog.ts');
 const {LIVE_DESTINATIONS}=await server.ssrLoadModule('/lib/features.ts');
 const now=new Date('2026-10-18T12:00:00+09:00'); // Sunday, independent of host timezone.
 const record=(days,mood=3,extra={})=>({id:String(days),createdAt:new Date(+now+days*86400000).toISOString(),updatedAt:now.toISOString(),mood,...extra});
 const state=emptyState();
 check('74 unique curated actions across all six categories',()=>{assert.equal(ACTIONS.length,74);assert.equal(new Set(ACTIONS.map(a=>a.id)).size,74);for(const category of ['REST','BODY','BEAUTY','PLAY','LEARN','CONNECT'])assert.ok(ACTIONS.filter(a=>a.category===category).length>=10);});
 check('short concrete actions have runnable steps; destinations remain explicit',()=>{for(const a of ACTIONS.filter(a=>a.minutes>0&&a.minutes<=5&&!a.opens&&!a.destination))assert.ok(a.steps?.length>=2||a.id==='breathing',a.id);assert.ok(!/治る|自律神経|治療/.test(JSON.stringify(ACTIONS)));});
 check('first day has no invented comparisons',()=>{state.checkins=[record(0)];const r=buildDailyReflection(state,now);assert.equal(r.stage,'first_day');assert.deepEqual(r.yesterdayMessages,[]);});
 check('yesterday compares only explicitly provided facts',()=>{state.checkins=[record(-1,3,{sleep:7,stress:'普通'}),record(0,4,{sleep:5,stress:'普通'})];const r=buildDailyReflection(state,now);assert.ok(r.yesterdayMessages.some(s=>s.includes('上向き')));assert.ok(r.yesterdayMessages.some(s=>s.includes('少なめ')));assert.ok(r.yesterdayMessages.some(s=>s.includes('ストレス')&&s.includes('同じ')));assert.ok(!/だから|原因|身体の疲れ/.test(r.yesterdayMessages.join('')));});
 check('seven scattered records are not the current calendar week',()=>{state.checkins=[-30,-20,-10,-8,-6,-3,0].map(d=>record(d));const r=buildDailyReflection(state,now);assert.equal(r.stage,'recent');assert.equal(reflectionHeading(state,r.stage,now),'最近のあなた');});
 check('five different current JST week days permit weekly reflection',()=>{state.checkins=[-6,-5,-4,-2,0].map(d=>record(d));const r=buildDailyReflection(state,now);assert.equal(r.stage,'weekly');assert.equal(reflectionHeading(state,r.stage,now),'今週のあなた');});
 check('JST Monday midnight resets current week and deduplicates day',()=>{const monday=new Date('2026-10-18T15:01:00Z');state.checkins=[-6,-5,-4,-2,0].map(d=>record(d));state.checkins.push({...record(1),id:'monday',createdAt:'2026-10-18T15:00:00Z'});assert.notEqual(buildDailyReflection(state,monday).stage,'weekly');});
 check('Discover has broad candidates without unavailable destinations',()=>{state.checkins=[];assert.ok(recommend(state,now,undefined,100).length>=60);assert.ok(recommend(state,now,undefined,100).every(r=>r.action.destination!=='place'&&r.action.destination!=='circle'));});
 check('Today exclusion leaves other choices within each category',()=>{state.checkins=[record(0,4)];const ids=new Set(todayPlans(state,now).map(r=>r.action.id));for(const category of ['REST','BODY','BEAUTY','PLAY','LEARN','CONNECT'])assert.ok(recommend(state,now,category,100).filter(r=>!ids.has(r.action.id)).length>=8);});
 check('recording shown plans cannot reshuffle Today or cycle impressions',()=>{state.contextualMemory=[];state.checkins=[record(0,4)];const before=todayPlans(state,now).map(r=>r.action.id);state.contextualMemory=before.map((actionId,index)=>({id:String(index),actionId,event:'proposed',createdAt:now.toISOString(),context:{timeBand:'昼'}}));assert.deepEqual(todayPlans(state,now).map(r=>r.action.id),before);});
 check('dislike lowers an otherwise equal candidate',()=>{state.checkins=[];const before=recommend(state,now,'PLAY',100).find(r=>r.action.id==='music').score;state.contextualMemory=[{id:'memory',actionId:'music',event:'dismissed',dismissReason:'dislike',createdAt:now.toISOString(),context:{timeBand:'昼'}}];const after=recommend(state,now,'PLAY',100).find(r=>r.action.id==='music').score;assert.ok(after<before);});
 check('Circle analytics strip all content and private identity fields',()=>{for(const name of ['circle_view','circle_join','circle_leave','circle_post_create','circle_comment_create','circle_reaction','circle_report','circle_block']){const result=sanitizeEventProperties({id:'e',name,createdAt:now.toISOString(),properties:{circle_id:'tired',text:'PRIVATE',comment:'PRIVATE',name:'PRIVATE',uid:'PRIVATE',authorId:'PRIVATE'}},state);assert.ok(!JSON.stringify(result).includes('PRIVATE'));}const result=sanitizeEventProperties({id:'e',name:'circle_join',createdAt:now.toISOString(),properties:{circle_id:'PRIVATE_CIRCLE'}},state);assert.equal(result.circle_id,undefined);});
 check('Circle gate and Place stay closed by default',()=>{assert.equal(LIVE_DESTINATIONS.has('circle'),false);assert.equal(LIVE_DESTINATIONS.has('place'),false);});
 console.log(`Phase 1 core checks: ${count} passed`);
}finally{await server.close();}
