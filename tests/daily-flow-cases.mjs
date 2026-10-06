import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {createElement,StrictMode,act,useEffect} from 'react';
const dom=new Window({url:'http://localhost/'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','Event','MouseEvent','localStorage','sessionStorage'])globalThis[key]=key==='window'?dom:dom[key];
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');
const rootPath=fileURLToPath(new URL('..',import.meta.url));
globalThis.__funnelCaptured=[];
const server=await createServer({configFile:false,root:rootPath,resolve:{alias:{'@':rootPath}},server:{middlewareMode:true},appType:'custom',plugins:[{name:'isolated-test-network',enforce:'pre',resolveId(id){if(id.includes('schoolpark/sync'))return '\0sync-mock';if(id.includes('analytics/posthog'))return '\0analytics-mock';},load(id){if(id==='\0sync-mock')return 'export const syncToSchoolPark=()=>{};export const deleteSyncedCamelliaData=async()=>{};export const prepareSchoolParkAccount=async s=>s;export const getSyncStatus=()=>({phase:"idle"});export const subscribeSyncStatus=()=>()=>{};export const flushSchoolParkSync=async()=>{};';if(id==='\0analytics-mock')return 'export const resetAnalyticsIdentity=()=>{};export const forwardEvent=e=>{globalThis.__funnelCaptured.push({...e});return true;};';}}]});
const result=[];
try{
 const {emptyState}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 const {recommend}=await server.ssrLoadModule('/lib/recommendation/engine.ts');
 const {FortuneScreen}=await server.ssrLoadModule('/screens/FortuneScreen.tsx');
 const {TodayScreen}=await server.ssrLoadModule('/screens/TodayScreen.tsx');
 const now=new Date(),iso=now.toISOString();
 const base=(minutes)=>{const s=emptyState();s.profile={...s.profile,name:'テスト',availableMinutes:minutes};s.checkins=[{id:'c',mood:3,createdAt:iso,updatedAt:iso}];s.onboardingComplete=true;return s};

 // Recommendation: the minutes limit narrows choices, but never down to "do nothing" only.
 const tiny=recommend(base(1),now).filter(r=>r.action.id!=='do-nothing');
 result.push(['1分でも行動の提案が出る',tiny.length>=2,tiny.map(r=>`${r.action.id}:${r.action.minutes}`)]);
 const ten=recommend(base(10),now);
 result.push(['10分なら10分以内の提案だけ',ten.length>=2&&ten.every(r=>r.action.minutes<=10),ten.map(r=>`${r.action.id}:${r.action.minutes}`)]);

 const host=document.createElement('div');document.body.append(host);const app=createRoot(host);
 const render=async el=>{await act(async()=>{app.render(createElement(StrictMode,null,el));await new Promise(r=>setTimeout(r,10));});};
 const click=async el=>{assert.ok(el,'control exists');await act(async()=>{el.dispatchEvent(new dom.MouseEvent('click',{bubbles:true}));el.dispatchEvent(new dom.MouseEvent('click',{bubbles:true}));await new Promise(r=>setTimeout(r,5));});};
 const button=text=>[...host.querySelectorAll('button')].find(el=>el.textContent.includes(text));

 // Fortune: no draw before today's Check.
 const noop=()=>{};const tracked=[];
 const before=base(20);before.checkins=[];
 await render(createElement(FortuneScreen,{state:before,recommendations:[],onBack:noop,onSave:noop,onTrack:n=>tracked.push(n),onAction:noop}));
 result.push(['Check前は今日の一枚を引けない',Boolean(button('TodayでCheckする'))&&!button('一枚引く'),host.textContent.slice(0,80)]);
 // Fortune: after the Check, one draw even on a double tap.
 const saves=[];
 await render(createElement(FortuneScreen,{state:base(20),recommendations:[],onBack:noop,onSave:f=>saves.push(f),onTrack:n=>tracked.push(n),onAction:noop}));
 await click(button('一枚引く'));
 result.push(['二度押ししても1回だけ引く',saves.length===1&&tracked.filter(n=>n==='fortune_draw').length===1,{saves:saves.length,tracked}]);

 // Action: "どうだった？" right after finishing, not only at night.
 const done=base(20);done.actions=[{id:'a1',actionId:'breathing',title:'4回だけ深呼吸',category:'REST',status:'completed',startedAt:iso,completedAt:iso,createdAt:iso,updatedAt:iso}];
 const fb=[];
 await render(createElement(TodayScreen,{state:done,recommendations:[],onCheckView:noop,onCheckStart:noop,onCheckin:noop,onProposals:noop,onTrack:noop,onOpenAction:noop,onIntent:noop,onTalk:noop,onFortune:noop,onTree:noop,onComplete:noop,onFeedback:(...a)=>fb.push(a)}));
 const ask=host.querySelector('.reflection h2');
 result.push(['完了した行動に、すぐ「どうだった？」が出る',Boolean(ask)&&ask.textContent.includes('4回だけ深呼吸'),ask?.textContent]);
 await click(button('よかった'));
 result.push(['答えると記録される',fb.length>=1&&fb[0][2]==='great',fb]);
 // The store keeps one answer per finished action, even on a double tap.
 const {useCamelliaStore}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 let store;function Probe(){const current=useCamelliaStore();useEffect(()=>{store=current;});return null;}
 await render(createElement(Probe));
 await act(async()=>{store.addFeedback('r1','breathing','great');store.addFeedback('r1','breathing','bad');await new Promise(r=>setTimeout(r,5));});
 result.push(['同じ行動への答えは1件だけ',store.state.actionFeedback.filter(f=>f.actionRecordId==='r1').length===1,store.state.actionFeedback.map(f=>f.rating)]);
 await act(async()=>app.unmount());
}finally{await server.close();}
for(const[x,ok,detail]of result)console.log(`${x}: ${ok?'PASS':'FAIL'}`,JSON.stringify(detail));
if(result.some(x=>!x[1]))process.exitCode=1;
