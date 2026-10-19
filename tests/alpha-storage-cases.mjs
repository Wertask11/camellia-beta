import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {Window} from 'happy-dom';
const dom=new Window({url:'http://localhost'});
for(const key of ['window','document','HTMLElement','Event','MouseEvent','localStorage','sessionStorage'])globalThis[key]=key==='window'?dom:dom[key];
let syncCalls=0;globalThis.__alphaSync=()=>syncCalls++;
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false},plugins:[{name:'isolated-alpha-storage',enforce:'pre',resolveId(id){if(id.includes('schoolpark/sync'))return '\0alpha-sync';if(id.includes('analytics/posthog'))return '\0alpha-analytics';},load(id){if(id==='\0alpha-sync')return 'export const syncToSchoolPark=()=>globalThis.__alphaSync();export const deleteSyncedCamelliaData=async clear=>{clear();return {cloudDeleted:false};};export const prepareSchoolParkAccount=async s=>s;';if(id==='\0alpha-analytics')return 'export const forwardEvent=()=>false;export const resetAnalyticsIdentity=()=>{};';}}]});
try{
 const React=await import('react');const {createRoot}=await import('react-dom/client');
 const {emptyState,load,STORAGE_KEY,useCamelliaStore}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 const {validateStoredState}=await server.ssrLoadModule('/lib/storage/validation.ts');
 const at='2026-10-19T00:00:00Z';const state=emptyState();state.profile.name='synthetic';state.checkins=[{id:'check',mood:3,createdAt:at,updatedAt:at}];
 for(const field of ['treeLeaves','checkins','aiConversations','actions']){
  const broken={...state,[field]:{broken:true}};const raw=JSON.stringify(broken);localStorage.setItem(STORAGE_KEY,raw);
  let caught;try{load();}catch(e){caught=e;}assert.equal(caught.message,'LOCAL_DATA_UNREADABLE');assert.ok(caught.recovered);assert.equal(localStorage.getItem(STORAGE_KEY),raw);
  assert.equal(caught.recovered.profile.name,'synthetic');if(field!=='checkins')assert.equal(caught.recovered.checkins.length,1);
 }
 const mixed=validateStoredState({...state,checkins:[...state.checkins,null,{id:'bad',mood:99,createdAt:at}],aiConversations:[{id:'chat',createdAt:at,messages:[null]}]},emptyState());
 assert.equal(mixed.state.checkins.length,1);assert.equal(mixed.state.aiConversations.length,0);assert.equal(mixed.issues.length,2);
 localStorage.setItem(STORAGE_KEY,'{broken');assert.throws(load,/LOCAL_DATA_UNREADABLE/);assert.equal(localStorage.getItem(STORAGE_KEY),'{broken');
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;let store;const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 function Harness(){const current=useCamelliaStore();React.useEffect(()=>{store=current;});return React.createElement('p',null,current.storageError||'safe');}
 await React.act(async()=>{root.render(React.createElement(Harness));});assert.match(container.textContent,/LOCAL_DATA_UNREADABLE/);assert.equal(syncCalls,0);assert.equal(localStorage.getItem(STORAGE_KEY),'{broken');
 localStorage.setItem(STORAGE_KEY,JSON.stringify(state));await React.act(async()=>{store.retryStorage();});assert.equal(store.storageError,'');
 const original=globalThis.localStorage;globalThis.localStorage=new Proxy(original,{get(target,key){if(key==='setItem')return ()=>{throw new dom.DOMException('synthetic quota','QuotaExceededError');};const value=target[key];return typeof value==='function'?value.bind(target):value;}});
 const before=syncCalls;await React.act(async()=>{store.updateProfile({name:'unsaved change'});});assert.equal(store.storageError,'LOCAL_SAVE_FAILED');assert.equal(store.state.profile.name,'unsaved change');assert.equal(syncCalls,before);
 globalThis.localStorage=original;await React.act(async()=>{store.retryStorage();});assert.equal(store.storageError,'');assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).profile.name,'unsaved change');
 localStorage.setItem('camellia-fortune-reflect:profile:A:2026-10-19','yes');await React.act(async()=>{await store.reset();});assert.equal(localStorage.getItem('camellia-fortune-reflect:profile:A:2026-10-19'),null);
 await React.act(async()=>root.unmount());console.log('PASS storage: four broken collections, mixed records, invalid JSON preserved, no unsafe sync, quota caught, memory preserved/retry, deletion removes Fortune answers. Local-only synthetic data.');
}finally{await server.close();await dom.happyDOM.abort();}
