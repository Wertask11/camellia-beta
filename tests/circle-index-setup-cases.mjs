/** Build migration unit: synthetic credential fields and fake Google HTTP; never live writes. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ensureCircleIndexes} from '../scripts/circle-indexes.mjs';
const definitions=JSON.parse(await readFile('security/firestore.indexes.json','utf8')).indexes;
let calls=[];const stored=new Map();
const env={VERCEL_ENV:'production',CAMELLIA_CIRCLE_ENABLED:'true',FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({project_id:'emusch-2a111'})};
const request=async(url,options)=>{
 assert.ok(url.startsWith('https://firestore.googleapis.com/v1/projects/emusch-2a111/databases/(default)/collectionGroups/circle_'));assert.equal(options.headers.Authorization,'Bearer unit-only');assert.ok(options.signal);
 const method=options.method??'GET';calls.push({url,method});
 if(method==='GET')return Response.json({indexes:stored.get(url)??[]});
 assert.equal(method,'POST','never DELETE, PATCH, Rules or IAM requests');
 const index=JSON.parse(options.body);assert.equal(index.queryScope,'COLLECTION');assert.equal(index.fields.length,2);stored.set(url,[...(stored.get(url)??[]),{...index,state:'READY'}]);return Response.json({done:false});
};
let result=await ensureCircleIndexes({env,request,getToken:async()=>'unit-only',definitions});assert.equal(result.status,'building');assert.equal(calls.filter(x=>x.method==='POST').length,6);assert.equal(calls.filter(x=>x.method==='GET').length,4);assert.equal(result.indexes.length,6);
// An unrelated existing index must remain untouched and is never deleted.
const url=[...stored.keys()][0];stored.get(url).push({queryScope:'COLLECTION',fields:[{fieldPath:'legacy',order:'ASCENDING'},{fieldPath:'other',order:'ASCENDING'}],state:'READY'});
calls=[];result=await ensureCircleIndexes({env,request,getToken:async()=>'unit-only',definitions});assert.equal(result.status,'ready');assert.equal(calls.filter(x=>x.method!=='GET').length,0);assert.equal(stored.get(url).length,3);
for(const target of ['preview',undefined])assert.equal((await ensureCircleIndexes({env:{...env,VERCEL_ENV:target},getToken:()=>{throw new Error('must not access credential');}})).status,'skipped');
result=await ensureCircleIndexes({env,definitions,getToken:async()=>'unit-only',request:async()=>new Response('private error text',{status:403})});assert.deepEqual(result,{status:'setup_failed',stage:'list',httpStatus:403,indexes:[]});assert.ok(!JSON.stringify(result).includes('private error text'));
assert.equal((await ensureCircleIndexes({env:{...env,FIREBASE_SERVICE_ACCOUNT_JSON:'invalid private text'},definitions})).status,'setup_failed');
console.log('Circle index setup PASS: production flag only, 6 additive definitions, idempotent, preserves unrelated indexes, no Rules/IAM/delete/user-content operations, sanitized failures. Live cloud writes NOT tested.');
