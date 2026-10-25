/** YURA / Lactone reactions (💓😀👏👍😭): decided on the device from her words (never waiting for the model), never
 *  bright on a painful message, stored only on her own message, and only the reaction name reaches analytics. Local only. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});
try{
 const {reactionFor,REACTION_EMOJI}=await server.ssrLoadModule('/lib/conversation/reactions.ts');
 const {parseConversationReply,CONVERSATION_RESPONSE_SCHEMA,ACTION_BRIDGE_INSTRUCTION}=await server.ssrLoadModule('/lib/conversation/action-bridge.ts');
 const {partialReply,consumeChatStream}=await server.ssrLoadModule('/lib/conversation/stream.ts');
 const {validConversationEntry}=await server.ssrLoadModule('/lib/conversation/entries.ts');
 const analytics=await server.ssrLoadModule('/lib/analytics/posthog.ts');

 assert.deepEqual(Object.values(REACTION_EMOJI),['💓','😀','👏','👍','😭']);
 for(const [message,reaction] of [
  ['母が亡くなった','cry'],['仕事がつらい','cry'],['眠れないし不安','cry'],['失恋して最悪','cry'],['しんどい','cry'],['頑張ったけど辛い','cry'],
  ['今日はプレゼンを最後までやりきった','clap'],['模様替えつかれた〜！','clap'],['試験に合格した','clap'],
  ['友だちと会えてうれしい','smile'],['カフェ楽しかった','smile'],
  ['明日からジムに行ってみようと思う','thumbs'],['なるほど','thumbs'],
  ['今日のCheckについて話したい','heart'],['明日の天気は？','heart'],
 ])assert.equal(reactionFor(message),reaction,message);
 assert.equal(reactionFor('ｼﾝﾄﾞｲ'.normalize('NFKC')),'heart','only the words she wrote');
 console.log('PASS only 💓😀👏👍😭, chosen from her words; a painful message always gets 😭');

 assert.deepEqual(Object.keys(CONVERSATION_RESPONSE_SCHEMA.properties),['reply','actionId'],'the model no longer chooses the reaction');
 assert.ok(!ACTION_BRIDGE_INSTRUCTION.includes('reaction'));
 assert.deepEqual(parseConversationReply('{"reply":"いい考えだね。","actionId":null}','この方法でやってみる'),{reply:'いい考えだね。'});
 assert.deepEqual(parseConversationReply('{"reaction":"clap","reply":"older shape still works","actionId":null}','x'),{reply:'older shape still works'});
 assert.equal(partialReply('{"reply":"すごい、最後まで'),'すごい、最後まで');
 const sse=frames=>new Response(new ReadableStream({start(c){for(const f of frames)c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(f)}\n\n`));c.close();}}));
 const seen=[];
 const done=await consumeChatStream(sse([{type:'start'},{type:'reaction',reaction:'heart'},{type:'delta',text:'うん'},{type:'done',reply:'うん',provider:'gemini'}]),t=>seen.push(t));
 assert.deepEqual(seen,['うん'],'an old reaction event is ignored');assert.equal(done.reply,'うん');
 console.log('PASS the reply needs nothing from the model about the reaction');

 const at=new Date().toISOString();
 assert.equal(validConversationEntry({id:'u',role:'user',text:'x',createdAt:at,reaction:'clap'}),true);
 assert.equal(validConversationEntry({id:'a',role:'assistant',text:'x',createdAt:at,reaction:'clap'}),false,'only her own message carries a reaction');
 assert.equal(validConversationEntry({id:'u',role:'user',text:'x',createdAt:at,reaction:'party'}),false);
 const safe=analytics.sanitizeEventProperties({id:'e',name:'conversation_reaction_shown',properties:{reaction:'clap',model_id:'yura',text:'秘密の本文'},createdAt:at},{profile:{id:'d'},analyticsEvents:[]});
 assert.equal(safe.reaction,'clap');assert.equal(safe.model_id,'yura');assert.ok(!JSON.stringify(safe).includes('秘密'));
 assert.equal(analytics.sanitizeEventProperties({id:'e',name:'conversation_reaction_shown',properties:{reaction:'💓'},createdAt:at},{profile:{id:'d'},analyticsEvents:[]}).reaction,undefined);
 console.log('PASS stored on her message only; analytics gets the reaction name, never the message');
}finally{await server.close();}
