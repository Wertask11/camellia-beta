import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});
try{
 const {LIVE_DESTINATIONS}=await server.ssrLoadModule('/lib/features.ts');
 const {ACTIONS}=await server.ssrLoadModule('/data/actions.ts');
 const {recommend}=await server.ssrLoadModule('/lib/recommendation/engine.ts');
 const {respond}=await server.ssrLoadModule('/lib/conversation/engine.ts');
 const {emptyState}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 const {mapCamelliaState}=await server.ssrLoadModule('/lib/schoolpark/map.ts');
 const {restoreArchive}=await server.ssrLoadModule('/lib/schoolpark/restore.ts');
 // β2: Circle and Place are coming soon.
 assert.equal(LIVE_DESTINATIONS.size,0);
 const at='2026-10-06T01:00:00Z',now=new Date('2026-10-06T10:00:00+09:00');
 const state=emptyState();state.profile={...state.profile,id:'p',name:'Synthetic user',interests:['人と話す'],priority:'話す',availableMinutes:60};
 state.checkins=[{id:'c',mood:2,stress:'高い',createdAt:at,updatedAt:at}];
 const shown=[undefined,'REST','BODY','BEAUTY','PLAY','LEARN','CONNECT'].flatMap(category=>recommend(state,now,category,20)).map(x=>x.action);
 assert.ok(shown.length>0);
 assert.ok(!shown.some(action=>action.requires&&!LIVE_DESTINATIONS.has(action.requires)),'no action needs a place that is not live');
 assert.ok(!shown.some(action=>action.id==='circle'),'the Circle action waits for Circle');
 assert.ok(recommend(state,now,'CONNECT',20).some(x=>x.action.id==='talk-ai'),'つながる still has an action');
 const talk=ACTIONS.find(action=>action.id==='talk-ai');
 assert.equal(talk.title,'Camelliaに話す');assert.equal(talk.opens,'camellia');assert.equal(talk.discoverCategory,'つながる');
 // Camellia does not offer Circle while it is coming soon.
 const lonely=respond(state,recommend(state,now),'誰かと話したい');
 assert.equal(lonely.intent,'CONNECT');assert.equal(lonely.showCircle,false);assert.ok(!/場所|Circle/.test(lonely.text),lonely.text);
 // Deleting a person from My Tree keeps only an empty marker, which survives the account archive.
 state.treeLeaves=[{id:'leaf',name:'',category:'friend',meaningTags:[],note:'',status:'removed',reflections:[],createdAt:at,updatedAt:at}];
 const archive=mapCamelliaState(state).filter(x=>x.path.startsWith('imports/')).map(x=>x.data);
 const leaf=archive.find(x=>x.kind==='tree-leaf');
 assert.ok(leaf&&!leaf.content.includes('Synthetic'),'the marker holds no personal text');
 assert.deepEqual(restoreArchive(archive,emptyState()).treeLeaves,state.treeLeaves);
 console.log('β2: PASS (no Circle/Place actions or offers while coming soon, Camelliaに話す opens the conversation, a deleted person stays deleted across devices).');
}finally{await server.close();}
