/** Isolated UI regression with fake network/auth dependencies; never live-login evidence. */
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {createElement,act} from 'react';
import {fileURLToPath} from 'node:url';
const dom=new Window({url:'http://localhost/'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','Event','MouseEvent','localStorage','sessionStorage'])globalThis[key]=key==='window'?dom:dom[key];
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
// The reaction's moment before her reply (about 1.5s) is not what this test is about (tests/reaction-browser.mjs is): run it at once.
const realSetTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...rest)=>realSetTimeout(fn,ms>=300&&ms<=1500?0:ms,...rest);
const {createRoot}=await import('react-dom/client');
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',plugins:[{name:'unit-fake-auth-only',enforce:'pre',resolveId(id){if(id.includes('schoolpark/firebase'))return '\0unit-auth';if(id.includes('schoolpark/sync'))return '\0unit-sync';if(id.includes('analytics/posthog'))return '\0unit-analytics';},load(id){if(id==='\0unit-sync')return 'export const syncToSchoolPark=()=>{};export const deleteSyncedCamelliaData=async()=>{};export const prepareSchoolParkAccount=async s=>s;';if(id==='\0unit-analytics')return 'export const resetAnalyticsIdentity=()=>{};export const forwardEvent=()=>{};';if(id==='\0unit-auth')return 'export const schoolParkAuth={currentUser:{getIdToken:async()=>"unit-token"}};';}}]});
const originalFetch=globalThis.fetch;
try{
 const {CamelliaScreen}=await server.ssrLoadModule('/screens/CamelliaScreen.tsx');
 const {emptyState}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 for(const mode of ['500','timeout','invalid-json','off']){
  let posts=0;const saved=[];
  globalThis.fetch=async(_,options)=>{
   if(options.method==='GET'){
    if(mode==='timeout')throw Object.assign(new Error('probe timeout'),{name:'TimeoutError'});
    if(mode==='500')return new Response('',{status:500});
    if(mode==='invalid-json')return new Response('oops',{status:200});
    return Response.json({enabled:false});
   }
   posts++;return Response.json({provider:'gemini',reply:'仕事のミスがまだ気になっているんだね。ここで聞くよ。'});
  };
  const host=document.createElement('div');document.body.append(host);const app=createRoot(host),noop=()=>{};
  await act(async()=>{app.render(createElement(CamelliaScreen,{state:emptyState(),recommendations:[],onSaveConversation:(...args)=>saved.push(args),onReplaceConversationAssistant:noop,onOpenAction:noop,onNavigate:noop,onClearTreeContext:noop,onTree:noop,onRemember:noop,onTrack:noop}));await new Promise(r=>setTimeout(r,25));});
  const starter=[...host.querySelectorAll('button')].find(b=>b.textContent==='今日あったことを話したい');assert.ok(starter);
  await act(async()=>{starter.click();await new Promise(r=>setTimeout(r,25));});
  assert.equal(posts,mode==='off'?0:1,mode+' must not silently disable on probe failure');
  assert.equal(saved[0][4],mode==='off'?'fallback':'gemini');
  if(mode!=='off')assert.ok(host.textContent.includes('仕事のミスがまだ気になっている'));
  await act(async()=>app.unmount());host.remove();console.log('PASS availability '+mode);
 }
}finally{globalThis.fetch=originalFetch;await server.close();await dom.happyDOM.abort();}
