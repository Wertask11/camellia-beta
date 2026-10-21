import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {Window} from 'happy-dom';
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false},appType:'custom'});
const dom=new Window({url:'https://example.test'});
const queues=[];
try{
 const {createDeliveryQueue,ANALYTICS_OUTBOX_KEY}=await server.ssrLoadModule('/lib/analytics/delivery.ts');
 const {analyticsSession,SESSION_IDLE_MS}=await server.ssrLoadModule('/lib/analytics/session.ts');
 globalThis.sessionStorage=dom.sessionStorage;
 let at=Date.parse('2026-10-20T14:59:00Z'),status=503,permitted=true;const sends=[],results=[];
 const storage=dom.localStorage;
 const packet=(id,profileKey='one')=>({id,event:'check_start',createdAt:new Date(at).toISOString(),profileKey,destination:'US_TEST_PROJECT',payload:{event:'check_start',properties:{$insert_id:id,distinct_id:'camellia_synthetic'},timestamp:new Date(at).toISOString()}});
 const make=(overrides={})=>{const q=createDeliveryQueue({storage:()=>storage,now:()=>at,permitted:()=>permitted,send:async p=>{sends.push(structuredClone(p));return status;},...overrides});queues.push(q);return q;};
 const q=make();q.activate('one','US_TEST_PROJECT');q.allow(false);assert.equal(q.enqueue(packet('first'),r=>results.push(r)),true);q.allow(true);await q.flush();q.allow(false);
 assert.equal(results.length,0);assert.equal(JSON.parse(storage.getItem(ANALYTICS_OUTBOX_KEY+'first')).receipt,undefined);
 const attempt=JSON.parse(storage.getItem(ANALYTICS_OUTBOX_KEY+'first'));assert.equal(attempt.attempts,1);assert.equal(attempt.nextAttempt,at+5000);
 // Reload uses durable pending row, original timestamp/insert id and one HTTP receipt.
 at+=5001;status=200;const reloaded=make();reloaded.activate('one','US_TEST_PROJECT');assert.equal(reloaded.enqueue(packet('first'),r=>results.push(r)),true);await reloaded.flush();reloaded.allow(false);
 assert.equal(results.length,1);assert.equal(results[0].status,'accepted');assert.equal(sends[0].payload.timestamp,sends[1].payload.timestamp);assert.equal(sends[0].id,sends[1].id);
 reloaded.enqueue(packet('first'),r=>results.push(r));await Promise.resolve();assert.equal(results.length,2);assert.equal(sends.length,2,'acknowledged event never sent again');
 const original=analyticsSession('A',at);assert.equal(original.fresh,true);assert.equal(analyticsSession('A',at+10).fresh,false);assert.equal(analyticsSession('A',at+SESSION_IDLE_MS+20).fresh,true);assert.equal(analyticsSession('B',at+SESSION_IDLE_MS+30).fresh,true);
 sessionStorage.clear();analyticsSession('A',Date.parse('2026-10-20T14:59:59Z'));assert.equal(analyticsSession('A',Date.parse('2026-10-20T15:00:00Z')).fresh,true,'JST midnight renews session');
 const gated=make();gated.activate('two','US_TEST_PROJECT');gated.allow(false);gated.enqueue(packet('other','one'));gated.allow(true);await gated.flush();assert.equal(sends.length,2,'wrong profile never sent');
 gated.activate('one','US_TEST_PROJECT');permitted=false;await gated.flush();assert.equal(sends.length,2,'DNT/optout always gates transport');permitted=true;gated.allow(false);
 const quota=make({storage:()=>new Proxy(storage,{get(target,key){if(key==='setItem')return()=>{throw Error('quota')};const value=target[key];return typeof value==='function'?value.bind(target):value;}})});assert.equal(quota.enqueue(packet('quota')),false);
 storage.setItem(ANALYTICS_OUTBOX_KEY+'broken','{broken');assert.equal(quota.enqueue(packet('broken')),false);assert.equal(storage.getItem(ANALYTICS_OUTBOX_KEY+'broken'),'{broken','corrupt outbox not overwritten');
 status=400;const rejected=make();rejected.activate('reject','US_TEST_PROJECT');rejected.enqueue(packet('reject','reject'),r=>results.push(r));await rejected.flush();rejected.allow(false);assert.equal(JSON.parse(storage.getItem(ANALYTICS_OUTBOX_KEY+'reject')).blocked,true);assert.equal(results.length,2,'400 not falsely accepted');
 let failReceipts=false;const receiptStorage=new Window().localStorage;let receiptSends=0;
 const noReceipt=make({now:Date.now,storage:()=>new Proxy(receiptStorage,{get(target,key){if(key==='setItem'&&failReceipts)return()=>{throw Error('quota')};const value=target[key];return typeof value==='function'?value.bind(target):value;}}),send:async()=>{receiptSends++;return 200;}});
 noReceipt.activate('one','US_TEST_PROJECT');noReceipt.enqueue({...packet('receipt-quota'),createdAt:new Date().toISOString()});failReceipts=true;await noReceipt.flush();await new Promise(resolve=>setTimeout(resolve,25));assert.equal(receiptSends,1,'receipt quota cannot spin/network flood');noReceipt.pause();
 const invalid=make();assert.equal(invalid.enqueue({...packet('invalid'),createdAt:'bad'}),false);
 // Separate tab queues don't overwrite each other's outbox. Reset while request is in flight cannot resurrect it.
 const storage2=new Window().localStorage;let resolve;const racing=make({storage:()=>storage2,send:()=>new Promise(r=>resolve=r)});racing.activate('one','US_TEST_PROJECT');racing.enqueue(packet('race'));const pending=racing.flush();await Promise.resolve();racing.clear();resolve(200);await pending;assert.equal(storage2.length,0);
 const distinct=make();distinct.allow(false);distinct.enqueue(packet('tab-a'));const tab=make();tab.allow(false);tab.enqueue(packet('tab-b'));assert.ok(storage.getItem(ANALYTICS_OUTBOX_KEY+'tab-a'));assert.ok(storage.getItem(ANALYTICS_OUTBOX_KEY+'tab-b'));
 console.log('PASS durable delivery: real failure pending, receipt-only success, reload retry/dedupe/time, DNT, identity, quota/corruption, 400, reset race, multiple tabs; session idle/JST/account boundaries. Transport is synthetic, not ingestion.');
}finally{for(const queue of queues)queue.pause();await server.close();await dom.happyDOM.close();}
