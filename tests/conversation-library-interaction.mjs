/** Local store/UI test with provider explicitly OFF. No live-auth acceptance. */
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {createElement,act,useEffect} from 'react';
import {fileURLToPath} from 'node:url';
const dom=new Window({url:'http://localhost/'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','Event','MouseEvent','localStorage','sessionStorage'])globalThis[key]=key==='window'?dom:dom[key];
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
// The reaction's moment before her reply (about 1.5s) is not what this test is about (tests/reaction-browser.mjs is): run it at once.
const realSetTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...rest)=>realSetTimeout(fn,ms>=300&&ms<=1500?0:ms,...rest);
const {createRoot}=await import('react-dom/client');
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',plugins:[{name:'isolated-storage-test',enforce:'pre',resolveId(id){if(id.includes('schoolpark/sync'))return '\0sync';if(id.includes('analytics/posthog'))return '\0analytics';},load(id){if(id==='\0sync')return 'export const syncToSchoolPark=()=>{};export const deleteSyncedCamelliaData=async()=>{};export const prepareSchoolParkAccount=async s=>s;';if(id==='\0analytics')return 'export const forwardEvent=()=>{};export const resetAnalyticsIdentity=()=>{};';}}]});
const previousFetch=globalThis.fetch;let app;
try{
 globalThis.fetch=async(_,options)=>{assert.equal(options.method,'GET','OFF never posts externally');return Response.json({enabled:false});};
 const {ConversationWorkspace}=await server.ssrLoadModule('/screens/ConversationWorkspace.tsx');
 const {emptyState,useCamelliaStore,STORAGE_KEY,load}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 const initial=emptyState(),now=new Date().toISOString(),legacy={id:'legacy',createdAt:now,updatedAt:now,messages:[{id:'u',role:'user',text:'前からあった会話',createdAt:now},{id:'a',role:'assistant',text:'以前の返答',provider:'fallback',createdAt:now}]};initial.aiConversations=[legacy];localStorage.setItem(STORAGE_KEY,JSON.stringify(initial));
 let store;const noop=()=>{};
 function Harness(){const current=useCamelliaStore();useEffect(()=>{store=current;});return current.ready?createElement(ConversationWorkspace,{state:current.state,recommendations:[],onSaveConversation:current.addConversation,onReplaceConversationAssistant:current.replaceConversationAssistant,onOpenAction:noop,onNavigate:noop,onClearTreeContext:noop,onTree:noop,onRemember:noop,onTrack:noop}):null;}
 const host=document.createElement('div');document.body.append(host);app=createRoot(host);
 const pause=()=>new Promise(r=>setTimeout(r,25));
 const click=async(text)=>{const button=[...host.querySelectorAll('button')].find(b=>b.textContent.includes(text)||b.getAttribute('aria-label')===text);assert.ok(button,text);await act(async()=>{button.click();await pause();});};
 await act(async()=>{app.render(createElement(Harness));await pause();});await act(pause);
 await click('新しい会話を始める');await act(pause);await click('今日あったことを話したい');
 assert.equal(store.state.aiConversations.length,2);assert.deepEqual(store.state.aiConversations.find(c=>c.id==='legacy'),legacy);const created=store.state.aiConversations.find(c=>c.id!=='legacy');assert.equal(created.messages.length,2);console.log('PASS new-chat UI saves a separate thread without modifying legacy history');
 await click('会話一覧へ戻る');await click('前からあった会話');await act(pause);await click('今日あったことを話したい');
 assert.equal(store.state.aiConversations.find(c=>c.id==='legacy').messages.length,4);assert.equal(store.state.aiConversations.find(c=>c.id===created.id).messages.length,2);console.log('PASS selected old thread alone receives the next reply');
 assert.equal(load().aiConversations.length,2);console.log('PASS both threads persist in existing v3 storage');
}finally{if(app)await act(async()=>app.unmount());globalThis.fetch=previousFetch;await server.close();await dom.happyDOM.abort();}
