import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createServer} from 'vite';
assert.match(process.env.FIRESTORE_EMULATOR_HOST??'',/^(127\.0\.0\.1|localhost):8085$/);
const app=initializeApp({projectId:'demo-camellia'},'free-chat-test'),db=getFirestore(app);
const server=await createServer({configFile:false,resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try{
 const {takeFreeDaily,freeIdentity}=await server.ssrLoadModule('/lib/free/access.ts'),{createFreeChatRuntime}=await server.ssrLoadModule('/lib/free/chat-runtime.ts');
 const headers={origin:'https://local.test',host:'local.test','content-type':'application/json','x-vercel-forwarded-for':'192.0.2.4'},secret='LOCAL_FIXTURE_SECRET',time=Date.parse('2026-11-16T06:00:00Z');
 const identity=freeIdentity(headers,secret,time),results=await Promise.all(Array.from({length:34},()=>takeFreeDaily(db,identity,crypto.randomUUID(),time)));assert.equal(results.filter(Boolean).length,30);
 assert.equal(await takeFreeDaily(db,freeIdentity(headers,secret,time),crypto.randomUUID(),time),false,'new cookie cannot bypass same network');
 assert.equal(await takeFreeDaily(db,{...identity,networkKey:'other-network'},crypto.randomUUID(),time),false,'network change cannot bypass same device');
 const next=freeIdentity(headers,secret,time+86400000),id=crypto.randomUUID();assert.equal(await takeFreeDaily(db,next,id,time+86400000),true);assert.equal(await takeFreeDaily(db,next,id,time+86400000),false);
 let calls=0;const generator=async(_c,_p,controls)=>{calls++;controls?.onText?.('いま、');controls?.onText?.('どんな気持ち？');return JSON.stringify({reply:'いま、どんな気持ち？'});};
 const runtime=createFreeChatRuntime({db,secret,env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'LOCAL_ONLY'},generate:generator,generateStream:generator});
 const response=()=>({code:200,headers:{},data:null,chunks:[],setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.data=v;},write(v){this.chunks.push(v);},end(){},flushHeaders(){}});
 const h={...headers,'x-vercel-forwarded-for':'192.0.2.55',accept:'text/event-stream'},req={method:'POST',headers:h,body:{message:'今日は少し話したい',modelId:'yura',requestId:crypto.randomUUID()}};
 let r=response();await runtime(req,r);assert.equal(r.code,200);assert.equal(calls,1);assert.ok(r.chunks.join('').includes('"provider":"gemini"'));assert.match(r.headers['Set-Cookie'],/HttpOnly/);
 r=response();await runtime({...req,headers:{...h,origin:'https://attacker.test'}},r);assert.equal(r.code,403);assert.equal(calls,1);
 r=response();await runtime({...req,body:{...req.body,usageLane:'referral_extension'}},r);assert.equal(r.code,400);assert.equal(calls,1);
 await db.doc('camellia_admin/release_phase1/config/free_chat').set({enabled:false});r=response();await runtime(req,r);assert.equal(r.code,503);assert.equal(calls,1);await db.doc('camellia_admin/release_phase1/config/free_chat').delete();
 await db.doc('camellia_admin/release_phase1/config/access').set({inviteRequired:true});r=response();await runtime(req,r);assert.equal(r.code,503);assert.equal(calls,1);await db.doc('camellia_admin/release_phase1/config/access').delete();
 console.log('PASS atomic 30/day concurrency, cookie/network reset resistance, JST/replay, actual Free gateway with stream SDK fixture, CSRF/referral lane refusal, invite/emergency stop. No real Gemini or Production.');
}finally{await server.close();await deleteApp(app);}
