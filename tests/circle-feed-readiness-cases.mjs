/** Query-plan diagnostics only: fake HTTP responses, never user auth or real records. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false}});
try{
 const {createFeedQueryProbe}=await server.ssrLoadModule('/lib/circle/readiness.ts');
 let time=0,calls=0;
 const request=async(url,options)=>{
  calls++;assert.equal(url,'https://firestore.googleapis.com/v1/projects/emusch-2a111/databases/(default)/documents/camellia_admin/release_phase1:runQuery');
  const body=JSON.parse(options.body);assert.deepEqual(body.explainOptions,{analyze:false});assert.equal(body.structuredQuery.limit,1);assert.deepEqual(body.structuredQuery.from,[{collectionId:'circle_posts'}]);assert.equal(body.structuredQuery.where.fieldFilter.value.stringValue,'working');assert.deepEqual(body.structuredQuery.orderBy.map(x=>x.direction),['DESCENDING','DESCENDING']);
  assert.equal(options.headers.Authorization,'Bearer unit-only-not-real');assert.ok(options.signal);
  return new Response(JSON.stringify({error:{status:'FAILED_PRECONDITION',message:'unit index missing; never echo this text'}}),{status:400});
 };
 const probe=createFeedQueryProbe(async()=>'unit-only-not-real',request,()=>time);
 assert.deepEqual(await Promise.all([probe(),probe()]),['index_required','index_required']);assert.equal(calls,1);await probe();assert.equal(calls,1);time=60001;await probe();assert.equal(calls,2);
 for(const [status,expected] of [[200,'ready'],[401,'credential_rejected'],[403,'permission_denied'],[500,'unavailable']]){
  const value=await createFeedQueryProbe(async()=>'unit-only',async()=>new Response('{}',{status}))();assert.equal(value,expected);
 }
 assert.equal(await createFeedQueryProbe(async()=>{throw new Error('private upstream text');})(),'unavailable');
 console.log('Feed readiness PASS: fixed plan-only query, no record execution, no echo of upstream content or credentials, shared cache and status mapping. Live Firestore not tested here.');
}finally{await server.close();}
