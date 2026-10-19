import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try{
 const {emptyState}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 const {appendConversationPair,switchConversationModel,replaceThreadReply,conversationModelSummary}=await server.ssrLoadModule('/lib/conversation/threads.ts');
 const {defaultConversationModel,conversationModelName}=await server.ssrLoadModule('/lib/conversation/models.ts');
 const {geminiHistory}=await server.ssrLoadModule('/lib/conversation/privacy.ts');
 const {validateStoredState}=await server.ssrLoadModule('/lib/storage/validation.ts');
 const {mapCamelliaState}=await server.ssrLoadModule('/lib/schoolpark/map.ts');
 const {restoreArchive}=await server.ssrLoadModule('/lib/schoolpark/restore.ts');
 const {sanitizeEventProperties}=await server.ssrLoadModule('/lib/analytics/posthog.ts');
 const now='2026-10-19T10:00:00.000Z';
 const legacy={id:'legacy',createdAt:now,updatedAt:now,messages:[{id:'old-u',role:'user',text:'以前の会話',createdAt:now},{id:'old-a',role:'assistant',text:'以前の返答',provider:'gemini',createdAt:now}]};
 const original=JSON.stringify(legacy);
 assert.equal(defaultConversationModel(legacy.activeModel),'yura');assert.equal(conversationModelName(legacy.messages[1].assistantModel),'Camellia');assert.equal(conversationModelSummary(legacy),'');
 let conversations=[legacy];
 const pair=(model,index)=>[{id:`u-${index}`,role:'user',text:`相談${index}`,createdAt:now},{id:`a-${index}`,role:'assistant',text:`返答${index}`,assistantModel:model,provider:'gemini',createdAt:now}];
 for(let n=0;n<3;n++)conversations=appendConversationPair(conversations,'new',pair('yura',n),now,'yura');
 conversations=switchConversationModel(conversations,'new','lactone','yura',now,'switch-1');
 for(let n=3;n<6;n++)conversations=appendConversationPair(conversations,'new',pair('lactone',n),now,'lactone');
 let thread=conversations.find(c=>c.id==='new');assert.equal(thread.messages.length,13);assert.equal(thread.activeModel,'lactone');assert.equal(thread.messages.filter(m=>m.role==='system').length,1);assert.equal(thread.messages.filter(m=>m.role==='assistant'&&m.assistantModel==='yura').length,3);assert.equal(thread.messages.filter(m=>m.role==='assistant'&&m.assistantModel==='lactone').length,3);assert.equal(conversationModelSummary(thread),'YURA → Lactone');
 conversations=switchConversationModel(conversations,'new','yura','lactone',now,'switch-2');thread=conversations.find(c=>c.id==='new');assert.equal(thread.activeModel,'yura');assert.equal(thread.messages.filter(m=>m.role==='system').length,2);
 conversations=replaceThreadReply(conversations,'new','相談5','再試行の返答','gemini',now,'lactone');thread=conversations.find(c=>c.id==='new');assert.equal(thread.activeModel,'yura');assert.equal(thread.messages.find(m=>m.id==='a-5').assistantModel,'lactone');
 assert.equal(JSON.stringify(conversations.find(c=>c.id==='legacy')),original);
 const switchedLegacy=switchConversationModel([legacy],'legacy','lactone','lactone',now,'old-switch')[0];assert.equal(switchedLegacy.messages[1].assistantModel,undefined);assert.equal(conversationModelSummary(switchedLegacy),'Lactone');
 const state=emptyState();state.profile.lastConversationModel='lactone';state.aiConversations=conversations;
 const before=JSON.stringify(state);assert.deepEqual(validateStoredState(state,emptyState()).issues,[]);
 const documents=mapCamelliaState(state);const restored=restoreArchive(documents.filter(d=>d.path.startsWith('imports/')).map(d=>d.data),emptyState());
 assert.deepEqual(restored.aiConversations,conversations);assert.equal(restored.profile.lastConversationModel,'lactone');assert.deepEqual(validateStoredState(restored,emptyState()).issues,[]);assert.equal(JSON.stringify(state),before);
 assert.ok(documents.find(d=>d.path==='profile/chat').data.messages.every(m=>m.role!=='system'),'SchoolPark compatibility summary excludes markers');
 const history=geminiHistory(thread.messages);assert.ok(history.length<=8);assert.ok(history.every(m=>m.role!=='system'));assert.ok(!JSON.stringify(history).includes('system_model_switch'));assert.ok(!JSON.stringify(history).includes('切り替え'));
 const invalid=structuredClone(state);invalid.aiConversations[0].messages.push({id:'bad',role:'assistant',type:'system_model_switch',text:'',from:'yura',to:'lactone',createdAt:now});assert.ok(validateStoredState(invalid,emptyState()).issues.includes('aiConversations'));
 assert.equal(defaultConversationModel('unknown'),'yura');assert.equal(defaultConversationModel(undefined),'yura');assert.equal(conversationModelName(undefined),'Camellia');
 console.log('PASS legacy preservation, YURA 3 turns → Lactone 3 turns → YURA, markers and retry attribution');
 console.log('PASS local validation + archive/restore round-trip + preferred model (synthetic, not real login/Firestore acceptance)');
 for(const name of ['conversation_model_selected','conversation_model_switched']){
  const safe=sanitizeEventProperties({id:'event',name,createdAt:now,properties:{model_id:'yura',from_model:'yura',to_model:'lactone',text:'PRIVATE_BODY',title:'PRIVATE_TITLE',memory:'PRIVATE_MEMORY',uid:'PRIVATE_ID'}},state);assert.ok(!JSON.stringify(safe).includes('PRIVATE_'));
  const bad=sanitizeEventProperties({id:'event',name,createdAt:now,properties:{model_id:'arbitrary-private-prompt',from_model:'admin',to_model:'YURA'}},state);for(const key of ['model_id','from_model','to_model'])assert.equal(bad[key],undefined);
 }
 console.log('PASS model analytics allowlist rejects arbitrary identifiers and private content');
 assert.equal(state.personalMemories.length,0,'model changes and conversation saves do not create Memory');
}finally{await server.close();}
