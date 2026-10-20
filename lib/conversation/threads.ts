import type {AIConversation,AIMessage,ConversationModelId} from '@/types';
import {conversationModelName,defaultConversationModel,isConversationModel} from './models';
import {isModelSwitchMessage} from './entries';
export function conversationTitle(conversation?: AIConversation){
 const text=conversation?.messages.find(message=>message.role==='user')?.text.replace(/\s+/g,' ').trim();
 return text ? `${Array.from(text).slice(0,32).join('')}${Array.from(text).length>32?'…':''}` : '新しい会話';
}
export function appendConversationPair(conversations:AIConversation[],conversationId:string,messages:AIMessage[],now:string,modelId?:ConversationModelId){
 const current=conversations.find(item=>item.id===conversationId)??{id:conversationId,messages:[],createdAt:now,updatedAt:now};
 return [{...current,...(modelId&&!current.activeModel?{activeModel:modelId}:{}),messages:[...current.messages,...messages],updatedAt:now},...conversations.filter(item=>item.id!==conversationId)];
}
export function replaceThreadReply(conversations:AIConversation[],conversationId:string,userText:string,text:string,provider:'gemini'|'fallback',now:string,assistantModel?:ConversationModelId|null){
 return conversations.map(conversation=>{
  if(conversation.id!==conversationId)return conversation;
  const messages=[...conversation.messages];let index=-1;
  for(let i=messages.length-1;i>=0;i--)if(messages[i].role==='user'&&messages[i].text===userText){index=i;break;}
  const reply=index<0?-1:messages.findIndex((message,i)=>i>index&&message.role==='assistant');
  if(reply<0)return conversation;
  messages[reply]={...messages[reply],text,provider,createdAt:now,...(assistantModel!==undefined?{assistantModel}:{})};return {...conversation,messages,updatedAt:now};
 });
}

export function switchConversationModel(conversations:AIConversation[],id:string,to:ConversationModelId,initial:ConversationModelId,now:string,markerId:string){
 const existing=conversations.find(item=>item.id===id);
 const current=existing??{id,messages:[],createdAt:now,updatedAt:now,activeModel:initial};
 const from=defaultConversationModel(current.activeModel);
 const marker:AIMessage|undefined=from!==to&&current.messages.some(message=>message.role!=='system')?{id:markerId,role:'system',type:'system_model_switch',text:'',from,to,createdAt:now}:undefined;
 return [{...current,activeModel:to,messages:marker?[...current.messages,marker]:current.messages,updatedAt:now},...conversations.filter(item=>item.id!==id)];
}

export function conversationModelSummary(conversation:AIConversation){
 const path:ConversationModelId[]=[];
 for(const message of conversation.messages){
  const id=isModelSwitchMessage(message)?message.to:message.role==='assistant'?message.assistantModel:undefined;
  if(isConversationModel(id)&&path.at(-1)!==id)path.push(id);
 }
 if(isConversationModel(conversation.activeModel)&&path.at(-1)!==conversation.activeModel)path.push(conversation.activeModel);
 if(!path.length)return '';
 const labels=path.map(conversationModelName);
 return labels.length<=3?labels.join(' → '):`${labels[0]} → … → ${labels.at(-1)}`;
}
