/** YURA / Lactone reactions (💓😀👏👍): chosen in the same generation, shown before the reply, never bright on a
 *  painful message, stored only on her own message, and only the reaction name reaches analytics. Local only. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});
try{
 const {safeReaction,REACTION_EMOJI}=await server.ssrLoadModule('/lib/conversation/reactions.ts');
 const {parseConversationReply,CONVERSATION_RESPONSE_SCHEMA}=await server.ssrLoadModule('/lib/conversation/action-bridge.ts');
 const {partialReply,partialReaction,collectReplyStream,consumeChatStream}=await server.ssrLoadModule('/lib/conversation/stream.ts');
 const {createGeminiChatHandler}=await server.ssrLoadModule('/lib/conversation/gemini-server.ts');
 const {validConversationEntry}=await server.ssrLoadModule('/lib/conversation/entries.ts');
 const analytics=await server.ssrLoadModule('/lib/analytics/posthog.ts');

 assert.deepEqual(Object.values(REACTION_EMOJI),['💓','😀','👏','👍']);
 assert.equal(safeReaction('clap','今日はプレゼンを最後までやりきった'),'clap');
 assert.equal(safeReaction('none','明日の天気は？'),undefined);
 assert.equal(safeReaction('party','楽しい'),undefined,'only the four');
 for(const painful of ['母が亡くなった','仕事がつらい','眠れないし不安','失恋して最悪'])assert.equal(safeReaction('smile',painful),'heart',painful);
 assert.equal(safeReaction('heart','仕事がつらい'),'heart');
 assert.deepEqual(Object.keys(CONVERSATION_RESPONSE_SCHEMA.properties),['reaction','reply','actionId'],'the reaction is written first, so it can be shown first');
 console.log('PASS only 💓😀👏👍, and a painful message gets 💓 at most');

 assert.deepEqual(parseConversationReply('{"reaction":"thumbs","reply":"いい考えだね。","actionId":null}','この方法でやってみる'),{reply:'いい考えだね。',reaction:'thumbs'});
 assert.deepEqual(parseConversationReply('{"reaction":"none","reply":"そうなんだね。","actionId":null}','明日の予定'),{reply:'そうなんだね。'});
 assert.deepEqual(parseConversationReply('{"reply":"older shape still works","actionId":null}','x'),{reply:'older shape still works'});
 assert.equal(partialReaction('{"reaction":"cl'),undefined,'not before the value is complete');
 assert.equal(partialReaction('{"reaction":"clap","re'),'clap');
 assert.equal(partialReply('{"reaction":"clap","reply":"すごい、最後まで'),'すごい、最後まで','the reply preview still works after the reaction');
 assert.equal(partialReply('{"reply":"前の形"'),'前の形');
 const events=[];
 async function* chunks(){for(const text of ['{"reaction":"cla','p","reply":"すご','い！","actionId":null}'])yield {text};}
 await collectReplyStream(chunks(),text=>events.push(['text',text]),()=>{},new AbortController().signal,reaction=>events.push(['reaction',reaction]));
 assert.deepEqual(events[0],['reaction','clap'],'the reaction arrives before any reply text');
 assert.equal(events.filter(e=>e[0]==='reaction').length,1);
 console.log('PASS the reaction is read from the first chunks, ahead of the streamed reply');

 const sse=frames=>new Response(new ReadableStream({start(c){for(const f of frames)c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(f)}\n\n`));c.close();}}));
 const seen=[];
 const done=await consumeChatStream(sse([{type:'start'},{type:'reaction',reaction:'heart'},{type:'reaction',reaction:'<script>'},{type:'delta',text:'うん'},{type:'done',reply:'うん',provider:'gemini',reaction:'heart'}]),t=>seen.push(t),r=>seen.push(`reaction:${r}`));
 assert.deepEqual(seen,['reaction:heart','うん'],'an unknown reaction is ignored');
 assert.equal(done.reaction,'heart');
 console.log('PASS the client reads the reaction event and ignores anything else');

 const run=async(message,reaction='smile')=>{
  const written=[];let status;
  const handler=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'local-only',VERCEL_ENV:'preview'},verifyToken:async()=>({uid:'synthetic'}),getTodayMood:async()=>undefined,
   generate:async()=>{throw new Error('streaming expected');},
   generateStream:async(_c,_p,controls)=>{controls.onFirstChunk();controls.onReaction?.(reaction);controls.onText('うん');return `{"reaction":"${reaction}","reply":"うん、聞いてるよ。","actionId":null}`;}});
  await handler({method:'POST',headers:{authorization:'Bearer t',accept:'text/event-stream'},body:{message,modelId:'yura'}},{setHeader(){},status(s){status=s;return this;},flushHeaders(){},write(c){written.push(JSON.parse(c.replace(/^data: /,'')));},end(){},json(v){written.push({json:v});},once(){},off(){}});
  return {status,written};
 };
 const happy=await run('今日は久しぶりに友だちと会えた');
 assert.deepEqual(happy.written.map(e=>e.type),['start','reaction','delta','done']);
 assert.equal(happy.written[1].reaction,'smile');assert.equal(happy.written.at(-1).reaction,'smile');
 const sad=await run('最近ずっとつらい');
 assert.equal(sad.written[1].reaction,'heart');assert.equal(sad.written.at(-1).reaction,'heart','the final answer follows the same rule');
 const urgent=await run('死にたい');
 assert.equal(urgent.written[0].json.safety,true);assert.equal(urgent.written[0].json.reaction,undefined,'no reaction on an urgent safety reply');
 console.log('PASS the server sends the reaction first, softens it on painful messages, and adds none to safety replies');

 const at=new Date().toISOString();
 assert.equal(validConversationEntry({id:'u',role:'user',text:'x',createdAt:at,reaction:'clap'}),true);
 assert.equal(validConversationEntry({id:'a',role:'assistant',text:'x',createdAt:at,reaction:'clap'}),false,'only her own message carries a reaction');
 assert.equal(validConversationEntry({id:'u',role:'user',text:'x',createdAt:at,reaction:'party'}),false);
 const safe=analytics.sanitizeEventProperties({id:'e',name:'conversation_reaction_shown',properties:{reaction:'clap',model_id:'yura',text:'秘密の本文'},createdAt:at},{profile:{id:'d'},analyticsEvents:[]});
 assert.equal(safe.reaction,'clap');assert.equal(safe.model_id,'yura');assert.ok(!JSON.stringify(safe).includes('秘密'));
 assert.equal(analytics.sanitizeEventProperties({id:'e',name:'conversation_reaction_shown',properties:{reaction:'💓'},createdAt:at},{profile:{id:'d'},analyticsEvents:[]}).reaction,undefined);
 console.log('PASS stored on her message only; analytics gets the reaction name, never the message');
}finally{await server.close();}
