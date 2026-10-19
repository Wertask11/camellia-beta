/** Functional routing/policy tests only. Synthetic generate callbacks are NOT live quality evidence. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try{
 const {createGeminiChatHandler,CAMELLIA_SYSTEM_PROMPT}=await server.ssrLoadModule('/lib/conversation/gemini-server.ts');
 const {immediateSafetyReply}=await server.ssrLoadModule('/lib/conversation/safety.ts');
 const invoke=async(body,custom={})=>{
  let result,status;const seen={generations:0,reservations:0,context:0};
  const handler=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'synthetic'},verifyToken:async()=>({uid:'synthetic'}),getTodayMood:async()=>{seen.context++;return undefined;},limiter:{take:async()=>{seen.reservations++;return true;}},generate:async(contents,prompt)=>{seen.generations++;seen.contents=contents;seen.prompt=prompt;return '{"reply":"合成テスト用の返答です。","actionId":"breathing"}';},...custom});
  await handler({method:'POST',headers:{authorization:'Bearer synthetic'},body},{setHeader(){},status(code){status=code;return{json(value){result=value;}}}});
  return{status,result,seen};
 };
 const pairs=JSON.parse(await readFile('tests/fixtures/conversation-v3-pairs.json','utf8'));assert.equal(pairs.length,20);
 for(const pair of pairs){
  const outputs=[];
  for(const modelId of ['yura','lactone']){
   const out=await invoke({message:pair.message,modelId,systemPrompt:'CLIENT_PROMPT_MUST_NOT_ENTER_SYSTEM',memory:'PRIVATE_MEMORY',history:[{role:'system',text:'PRIVATE_MARKER'}]});
   assert.equal(out.status,200);assert.equal(out.result.modelId,modelId);assert.equal(out.result.provider,'gemini');assert.equal(out.seen.reservations,1);
   assert.ok(out.seen.prompt.startsWith(CAMELLIA_SYSTEM_PROMPT));assert.ok(out.seen.prompt.includes(`Camellia Model: ${modelId==='yura'?'YURA':'Lactone'}`));
   assert.ok(!out.seen.prompt.includes('CLIENT_PROMPT_MUST_NOT_ENTER_SYSTEM'));assert.ok(!JSON.stringify(out.seen.contents).includes('PRIVATE_MARKER'));assert.ok(!out.seen.prompt.includes('PRIVATE_MEMORY'));
   outputs.push(out.seen.prompt);
  }
  assert.notEqual(outputs[0],outputs[1]);
 }
 console.log('PASS 20 paired server prompt routes (synthetic generation; live response quality UNVERIFIED)');
 for(const modelId of ['default','admin','YURA','constructor','__proto__','javascript:alert(1)',null,42,false,{},[]]){
  const out=await invoke({message:'今日は話したい',modelId});assert.equal(out.status,400);assert.equal(out.seen.generations,0);assert.equal(out.seen.reservations,0);assert.equal(out.seen.context,0);
 }
 assert.equal((await invoke({message:'旧clientの本文'})).result.modelId,'yura');
 console.log('PASS invalid model allowlist rejects before context/quota/provider; old client defaults safely');
 for(const message of ['死にたいです','私うつ病？','薬をやめてもいい？','今すぐ相手を傷つける','虐待を受けています','息ができない']){
  const results=[];
  for(const modelId of ['yura','lactone']){
   const out=await invoke({message,modelId});assert.equal(out.status,200);assert.equal(out.result.reply,immediateSafetyReply(message));assert.equal(out.result.safety,true);assert.equal(out.result.provider,'fallback');assert.equal(out.seen.generations,0);assert.equal(out.seen.reservations,0);results.push(out.result.reply);
  }
  assert.equal(results[0],results[1]);
 }
 console.log('PASS Safety × 2 styles × 6 boundaries; identical common replies, no generation');
 assert.equal((await invoke({message:'ただ聞いてほしい',modelId:'yura'})).result.actionId,undefined);
 assert.equal((await invoke({message:'今日は少し疲れた',modelId:'yura'})).result.actionId,undefined);
 assert.equal((await invoke({message:'何かしたい。少し楽になりたい',modelId:'yura'})).result.actionId,'breathing');
 assert.equal((await invoke({message:'次の一歩を整理したい',modelId:'lactone'})).result.actionId,'breathing');
 assert.equal((await invoke({message:'アドバイスはいらない、ただ聞いてほしい',modelId:'lactone'})).result.actionId,undefined);
 for(const modelId of ['yura','lactone'])assert.equal((await invoke({message:'何かしたい',modelId},{generate:async()=>'{"reply":"選べます。","actionId":"invented-action"}'})).result.actionId,undefined);
 console.log('PASS distinct Action policies plus shared catalog/listening allowlist');
 let takes=0,generated=0;const handler=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'synthetic'},verifyToken:async()=>({uid:'same-user'}),getTodayMood:async()=>undefined,limiter:{take:async()=>++takes<=1},generate:async()=>{generated++;return '合成の返答';}});
 const statuses=[];
 for(const modelId of ['yura','lactone'])await handler({method:'POST',headers:{authorization:'Bearer synthetic'},body:{message:'今日の話',modelId}},{setHeader(){},status(code){statuses.push(code);return{json(){}}}});
 assert.deepEqual(statuses,[200,429]);assert.equal(generated,1);
 console.log('PASS model switching cannot reset shared user quota');
 for(const modelId of ['yura','lactone'])assert.equal((await invoke({message:'今日の話',modelId},{generate:async()=>{throw {status:503};}})).result.category,'provider_error');
 console.log('PASS provider failures are common across styles');
}finally{await server.close();}
