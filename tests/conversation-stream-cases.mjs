import assert from 'node:assert/strict';
import {createServer} from 'vite';
const s=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false},appType:'custom'});
try{
 const {partialReply,collectReplyStream,consumeChatStream}=await s.ssrLoadModule('/lib/conversation/stream.ts');
 const {createGeminiChatHandler}=await s.ssrLoadModule('/lib/conversation/gemini-server.ts');
 const {loadConversationContext}=await s.ssrLoadModule('/lib/conversation/context-loader.ts');
 const {geminiHistory}=await s.ssrLoadModule('/lib/conversation/privacy.ts');
 const {appendPendingConversationMessage,appendConversationPair,replaceThreadReply}=await s.ssrLoadModule('/lib/conversation/threads.ts');
 const {sanitizeEventProperties}=await s.ssrLoadModule('/lib/analytics/posthog.ts');
 const text='少しずつ\n「話す」\\こと🙂',raw=JSON.stringify({reply:text,actionId:null});
 for(let i=0;i<=raw.length;i++){
  const prefix=partialReply(raw.slice(0,i));assert.ok(text.startsWith(prefix));assert.ok(!/[\uD800-\uDBFF]$/.test(prefix));
 }
 assert.equal(partialReply(raw),text);assert.equal(partialReply('{"actionId":null,"reply":"secret"}'),'');
 assert.equal(Array.from(partialReply(JSON.stringify({reply:'あ'.repeat(400)}))).length,300);
 const chunks=async function*(){yield{text:raw.slice(0,15)};yield{text:raw.slice(15),candidates:[{finishReason:'STOP'}]};};
 let first=0,previews=[];assert.equal(await collectReplyStream(chunks(),t=>previews.push(t),()=>first++,new AbortController().signal),raw);assert.equal(first,1);assert.equal(previews.at(-1),text);
 const blocked=async function*(){yield{text:raw,candidates:[{finishReason:'SAFETY'}]};};
 previews=[];await assert.rejects(collectReplyStream(blocked(),t=>previews.push(t),()=>{},new AbortController().signal),e=>e.code==='SAFETY_BLOCK');assert.deepEqual(previews,[]);
 const encoder=new TextEncoder(),frame=data=>`data: ${JSON.stringify(data)}\n\n`;
 const wire=encoder.encode(frame({type:'start'})+frame({type:'delta',text})+frame({type:'done',reply:text,provider:'gemini',modelId:'yura'}));
 const response=()=>new Response(new ReadableStream({start(c){for(const byte of wire)c.enqueue(Uint8Array.of(byte));c.close();}}));
 const crlf=encoder.encode(frame({type:'done',reply:text,provider:'gemini'}).replace(/\n/g,'\r\n'));
 assert.equal((await consumeChatStream(new Response(new ReadableStream({start(c){for(const byte of crlf)c.enqueue(Uint8Array.of(byte));c.close();}})),()=>{})).reply,text);
 let shown='';assert.equal((await consumeChatStream(response(),t=>shown=t)).reply,text);assert.equal(shown,text);
 await assert.rejects(consumeChatStream(new Response(frame({type:'delta',text})),()=>{}),e=>e.category==='network');
 await assert.rejects(consumeChatStream(new Response(frame({type:'error',category:'safety_block'})),()=>{}),e=>e.category==='safety_block');
 let generation=0,reservations=0,verified=0;
 const deps={env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'synthetic'},verifyToken:async()=>{verified++;return{uid:'synthetic-A'};},getTodayMood:async()=>undefined,limiter:{take:()=>{reservations++;return true;}},generate:async()=>raw,generateStream:async(_contents,prompt,controls)=>{generation++;assert.match(prompt,/Camellia/);controls.onFirstChunk();controls.onText(text);return raw;}};
 const req={method:'POST',headers:{authorization:'Bearer synthetic',accept:'text/event-stream'},body:{message:'今日は少し話したい',modelId:'yura'}};
 const makeRes=()=>({frames:[],headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return{json:body=>this.json=body};},write(t){this.frames.push(t);},end(){this.ended=true;}});
 for(const modelId of ['yura','lactone']){const res=makeRes();await createGeminiChatHandler(deps)({...req,body:{...req.body,modelId}},res);assert.equal(res.code,200);assert.ok(res.headers['Content-Type'].startsWith('text/event-stream'));assert.equal(res.ended,true);const result=await consumeChatStream(new Response(res.frames.join('')),()=>{});assert.equal(result.modelId,modelId);assert.equal(result.reply,text);assert.equal(typeof result.timing.server_auth_ms,'number');}
 assert.equal(verified,2);assert.equal(reservations,2);assert.equal(generation,2);
 for(const message of ['死にたい','薬をやめていい？','私うつ病ですか','殴られて怖い','息ができない']){const before=generation,res=makeRes();await createGeminiChatHandler(deps)({...req,body:{message}},res);assert.equal(generation,before);assert.equal(res.json.safety,true);assert.equal(res.frames.length,0);}
 const limited=makeRes();await createGeminiChatHandler({...deps,limiter:{take:()=>false}})(req,limited);assert.equal(limited.code,429);assert.equal(limited.frames.length,0);
 const rejected=makeRes();await createGeminiChatHandler({...deps,verifyToken:async()=>{throw new Error();}})(req,rejected);assert.equal(rejected.code,401);assert.equal(rejected.frames.length,0);
 let reads=0;const paths=[];const db={doc:p=>{paths.push(p);return p;},getAll:async(...refs)=>{reads++;assert.equal(refs.length,3);assert.deepEqual(refs[2],{fieldMask:['mood','stage','actionId']});return[{data:()=>({mood:'とてもよい',private:'PRIVATE'})},{data:()=>({stage:'checked',actionId:'breathing',private:'PRIVATE'})}];}};
 const context=await loadConversationContext('synthetic-A',db);assert.equal(reads,1);assert.equal(paths.length,2);assert.equal(context.mood,'とてもよい');assert.ok(!JSON.stringify(context).includes('PRIVATE'));
 const noContext=await loadConversationContext('synthetic-B',{doc:p=>p,getAll:()=>new Promise(()=>{})},10);assert.deepEqual(noContext,{context:''});
 const now=new Date().toISOString(),user={id:'stable',role:'user',text:'合成QA',createdAt:now};
 let threads=appendPendingConversationMessage([],'thread',user,'yura',now);assert.equal(threads[0].messages.length,1);assert.equal(threads[0].messages[0].pending,true);
 threads=appendConversationPair(threads,'thread',[user,{id:'stable-a',role:'assistant',text,provider:'gemini',createdAt:now}],now,'yura');assert.equal(threads[0].messages.length,2);assert.equal(threads[0].messages[0].pending,undefined);
 let restored=appendPendingConversationMessage([],'thread',user,'lactone',now);restored=replaceThreadReply(restored,'thread',user.text,text,'gemini',now,'lactone');assert.equal(restored[0].messages.length,2);assert.equal(restored[0].messages[0].pending,false);
 const history=Array.from({length:10000},(_,i)=>({role:i%2?'assistant':'user',provider:i%3?'gemini':'fallback',text:String(i)}));history.splice(9950,0,{role:'system',text:''});
 const old=history.filter(m=>m.role!=='system');const expected=old.flatMap((m,i)=>m.role==='assistant'&&m.provider==='gemini'&&old[i-1]?.role==='user'?[old[i-1],m]:[]).slice(-8).map(({role,text})=>({role,text}));assert.deepEqual(geminiHistory(history),expected);
 const safe=sanitizeEventProperties({id:'qa',name:'conversation_response_received',createdAt:now,properties:{provider:'gemini',model_id:'yura',transport:'sse',client_first_visible_ms:123,server_auth_ms:-1,provider_total_ms:NaN,text:'PRIVATE',server_context_ms:'PRIVATE'}},{analyticsEvents:[]});
 assert.equal(safe.client_first_visible_ms,123);assert.equal(safe.server_auth_ms,undefined);assert.equal(safe.provider_total_ms,undefined);assert.ok(!JSON.stringify(safe).includes('PRIVATE'));
 const {classifyChatError}=await s.ssrLoadModule('/lib/conversation/gemini-server.ts');
 const {generateWithModelRecovery}=await s.ssrLoadModule('/lib/conversation/provider-recovery.ts');
 assert.equal(classifyChatError({code:'STREAM_INTERRUPTED',cause:{name:'TimeoutError'}}),'timeout');
 let attempts=0;await assert.rejects(generateWithModelRecovery({primary:'a',fallback:'b',signal:new AbortController().signal,request:async()=>{attempts++;throw{code:'STREAM_INTERRUPTED',cause:{status:503}};}}));assert.equal(attempts,1);
 const quotaFailure=makeRes();await createGeminiChatHandler({...deps,limiter:{take:()=>{throw new Error();}}})(req,quotaFailure);assert.equal(quotaFailure.code,503);assert.equal(quotaFailure.frames.length,0);
 const {safeConversationTimeline}=await s.ssrLoadModule('/lib/conversation/performance.ts');assert.deepEqual(safeConversationTimeline({T0:100,T7:NaN,uid:'PRIVATE',text:'PRIVATE'}),{T0:100});
 console.log('PASS stream JSON/Unicode framing, blocked chunk, missing done, error, per-model generation, shared Safety/Auth/quota gates, one-RPC bounded context, pending/retry/legacy history and numeric-only analytics (synthetic dependencies; not live Gemini).');
}finally{await s.close();}
