/** Synthetic local UI/store. No real authentication, provider, Firestore or quality acceptance. */
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {createElement,useEffect,act} from 'react';
const dom=new Window({url:'http://localhost/'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLDialogElement','Event','MouseEvent','localStorage','sessionStorage'])globalThis[key]=key==='window'?dom:dom[key];
// Focus/inert/keyboard behavior is tested separately in real Chromium.
dom.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
dom.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
// The reaction's moment before her reply (about 1.5s) is not what this test is about (tests/reaction-browser.mjs is): run it at once.
const realSetTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...rest)=>realSetTimeout(fn,ms>=300&&ms<=1500?0:ms,...rest);
const {createRoot}=await import('react-dom/client');
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false},plugins:[{name:'synthetic-ui-dependencies',enforce:'pre',resolveId(id){if(id.includes('schoolpark/sync'))return '\0sync';if(id.includes('analytics/posthog'))return '\0analytics';if(id.includes('schoolpark/firebase'))return '\0auth';},load(id){if(id==='\0sync')return 'export const syncToSchoolPark=()=>{};export const deleteSyncedCamelliaData=async()=>{};export const prepareSchoolParkAccount=async s=>s;';if(id==='\0analytics')return 'export const forwardEvent=()=>false;export const resetAnalyticsIdentity=()=>{};';if(id==='\0auth')return 'export const schoolParkAuth={currentUser:{getIdToken:async()=>"synthetic-local-only"}};';}}]});
const priorFetch=globalThis.fetch;let app;
try{
 const calls=[];let failNext=false;
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'/api/camellia/chat');if(options.method==='GET')return Response.json({enabled:true});
  const body=JSON.parse(options.body);calls.push(body);assert.ok(['yura','lactone'].includes(body.modelId));assert.ok(!JSON.stringify(body.history).includes('system_model_switch'));
  if(failNext){failNext=false;return Response.json({category:'provider_error'},{status:502});}
  return Response.json({reply:`合成の${body.modelId}返答${calls.length}`,provider:'gemini',modelId:body.modelId,responseTimeMs:1});
 };
 const {ConversationWorkspace}=await server.ssrLoadModule('/screens/ConversationWorkspace.tsx');
 const {useCamelliaStore,emptyState,STORAGE_KEY}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 const initial=emptyState(),now=new Date().toISOString();const legacy={id:'legacy',createdAt:now,updatedAt:now,messages:[{id:'old-u',role:'user',text:'以前からあった相談',createdAt:now},{id:'old-a',role:'assistant',text:'以前の返答',provider:'gemini',createdAt:now}]};
 initial.aiConversations=[legacy];const original=JSON.stringify(legacy);localStorage.setItem(STORAGE_KEY,JSON.stringify(initial));
 let store;const noop=()=>{};
 function Harness(){const current=useCamelliaStore();useEffect(()=>{store=current;});return current.ready?createElement(ConversationWorkspace,{state:current.state,recommendations:[],onSaveConversation:current.addConversation,onReplaceConversationAssistant:current.replaceConversationAssistant,onSelectConversationModel:current.selectConversationModel,onRemember:current.remember,onTrack:current.track,onClearTreeContext:noop,onOpenAction:noop,onNavigate:noop,onTree:noop}):null;}
 const host=document.createElement('div');document.body.append(host);
 const pause=()=>new Promise(resolve=>setTimeout(resolve,20));
 // A reply in progress (her reaction's moment, then the reply) keeps the buttons disabled for a few timer turns.
 const find=name=>[...host.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===name||b.textContent.includes(name));
 const click=async(name)=>{let button=find(name);for(let n=0;n<50&&button?.disabled;n++){await act(pause);button=find(name);}assert.ok(button,name);assert.equal(button.disabled,false,name);await act(async()=>{button.click();await pause();});for(let n=0;n<100&&host.querySelector('.model-selector-trigger:disabled');n++)await act(pause);assert.equal(Boolean(host.querySelector('.model-selector-trigger:disabled')),false,'reply must finish before the next assertion');};
 const choose=async(model)=>{const trigger=host.querySelector('.model-selector-trigger');assert.ok(trigger);await act(async()=>{trigger.click();await pause();});const option=[...host.querySelectorAll('[role="menuitemradio"]')].find(b=>b.textContent.startsWith(model));assert.ok(option);await act(async()=>{option.click();await pause();});};
 const mount=async()=>{app=createRoot(host);await act(async()=>{app.render(createElement(Harness));await pause();});await act(pause);};
 const send=()=>click('今日あったことを話したい');
 await mount();await click('新しい会話を始める');assert.ok(host.querySelector('.model-selector-trigger').textContent.includes('YURA'));
 for(let n=0;n<3;n++)await send();await choose('Lactone');for(let n=0;n<3;n++)await send();
 const id=store.state.aiConversations.find(c=>c.id!=='legacy'&&c.messages.length).id;
 let thread=store.state.aiConversations.find(c=>c.id===id);assert.equal(thread.messages.filter(m=>m.assistantModel==='yura').length,3);assert.equal(thread.messages.filter(m=>m.assistantModel==='lactone').length,3);assert.equal(thread.messages.filter(m=>m.type==='system_model_switch').length,1);
 assert.deepEqual(calls.slice(0,6).map(c=>c.modelId),['yura','yura','yura','lactone','lactone','lactone']);assert.equal(calls[3].history.length,6,'same-thread context crosses style switch');
 assert.equal(store.state.personalMemories.length,0);await click('会話一覧へ戻る');assert.ok(host.querySelector('.conversation-model-badge').textContent.includes('YURA → Lactone'));await click('今日あったことを話したい');assert.ok(host.querySelector('.model-selector-trigger').textContent.includes('Lactone'));
 await choose('YURA');await send();assert.equal(calls.at(-1).modelId,'yura');assert.ok(host.querySelector('.model-switch-marker'));assert.ok(calls.at(-1).history.length<=8);
 await click('会話一覧へ戻る');await click('新しい会話を始める');assert.ok(host.querySelector('.model-selector-trigger').textContent.includes('YURA'));await choose('Lactone');assert.equal(store.state.profile.lastConversationModel,'lactone');
 await act(async()=>app.unmount());await mount();await click('新しい会話を始める');assert.ok(host.querySelector('.model-selector-trigger').textContent.includes('Lactone'),'preferred model survives reload');
 await click('会話一覧へ戻る');await click('以前からあった相談');assert.ok(host.querySelector('.model-selector-trigger').textContent.includes('YURA'),'legacy thread defaults to YURA independently of preference');assert.equal(host.querySelector('.message-model-label').textContent,'Camellia');assert.equal(JSON.stringify(store.state.aiConversations.find(c=>c.id==='legacy')),original);
 await click('会話一覧へ戻る');await click('新しい会話を始める');await choose('YURA');failNext=true;await send();assert.ok(host.querySelector('.chat-error'));const failedId=store.state.aiConversations.find(c=>c.messages.some(m=>m.text.includes('今はうまく返せなかった'))).id;
 const beforeRetry=calls.length;await choose('Lactone');assert.ok(host.querySelector('.chat-error'),'selector must not clear shared API failure');assert.equal(calls.length,beforeRetry,'switching alone cannot retry');await click('もう一度試す');assert.equal(calls.at(-1).modelId,'yura','retry pins original request style');assert.ok(host.querySelector('.model-selector-trigger').textContent.includes('Lactone'));
 thread=store.state.aiConversations.find(c=>c.id===failedId);assert.equal(thread.activeModel,'lactone');assert.equal(thread.messages.filter(m=>m.role==='user').length,1);assert.equal(thread.messages.find(m=>m.role==='assistant').assistantModel,'yura');await send();assert.equal(calls.at(-1).modelId,'lactone');
 assert.equal(store.state.personalMemories.length,0);const remember=[...host.querySelectorAll('.memory-message-button')].at(-1);await act(async()=>{remember.click();await pause();});assert.equal(store.state.personalMemories.length,0);await click('この一言を覚えておく');assert.equal(store.state.personalMemories.length,1);
 assert.equal(JSON.stringify(store.state.aiConversations.find(c=>c.id==='legacy')),original);
 console.log('PASS UI/store YURA 3 turns → Lactone 3 turns → YURA; same-thread context, Library and reload preference');
 console.log('PASS legacy history retained; failed-request retry keeps original model, selected model/error remain independent');
 console.log('PASS Memory requires explicit confirmation; markers never enter provider history (synthetic only)');
}finally{if(app)await act(async()=>app.unmount());globalThis.fetch=priorFetch;await server.close();await dom.happyDOM.abort();}
