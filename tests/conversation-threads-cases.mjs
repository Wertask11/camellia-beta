import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});
try{
 const {appendConversationPair,replaceThreadReply,conversationTitle}=await server.ssrLoadModule('/lib/conversation/threads.ts');
 const {geminiHistory}=await server.ssrLoadModule('/lib/conversation/privacy.ts');
 const now='2026-10-16T00:00:00Z';
 const pair=(text)=>[{id:text+'u',role:'user',text,createdAt:now},{id:text+'a',role:'assistant',text:'reply '+text,provider:'gemini',createdAt:now}];
 const legacy=[{id:'old',messages:pair('前から残していた会話'),createdAt:now,updatedAt:now}];const snapshot=JSON.stringify(legacy);
 const two=appendConversationPair(legacy,'new',pair('新しい話'),now);
 assert.equal(two.length,2);assert.equal(JSON.stringify(legacy),snapshot);assert.deepEqual(two.find(t=>t.id==='old'),legacy[0]);console.log('PASS new conversation preserves all legacy messages');
 const continued=appendConversationPair(two,'old',pair('続きを話す'),now);
 assert.equal(continued.find(t=>t.id==='old').messages.length,4);assert.equal(continued.find(t=>t.id==='new').messages.length,2);console.log('PASS selection appends only to selected conversation');
 const retried=replaceThreadReply(continued,'new','新しい話','再試行の返答','gemini',now);
 assert.equal(retried.find(t=>t.id==='new').messages[1].text,'再試行の返答');assert.deepEqual(retried.find(t=>t.id==='old'),continued.find(t=>t.id==='old'));console.log('PASS retry targets its original conversation');
 const history=geminiHistory(retried.find(t=>t.id==='new').messages);assert.ok(!JSON.stringify(history).includes('前から'));console.log('PASS provider history cannot include a different thread');
 assert.equal(conversationTitle(legacy[0]),'前から残していた会話');assert.equal(conversationTitle(),'新しい会話');console.log('PASS titles derive from existing first message without migration');
}finally{await server.close();}
