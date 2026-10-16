import type {AIConversation,AIMessage} from '@/types';
export function conversationTitle(conversation?: AIConversation){
 const text=conversation?.messages.find(message=>message.role==='user')?.text.replace(/\s+/g,' ').trim();
 return text ? `${Array.from(text).slice(0,32).join('')}${Array.from(text).length>32?'…':''}` : '新しい会話';
}
export function appendConversationPair(conversations:AIConversation[],conversationId:string,messages:AIMessage[],now:string){
 const current=conversations.find(item=>item.id===conversationId)??{id:conversationId,messages:[],createdAt:now,updatedAt:now};
 return [{...current,messages:[...current.messages,...messages],updatedAt:now},...conversations.filter(item=>item.id!==conversationId)];
}
export function replaceThreadReply(conversations:AIConversation[],conversationId:string,userText:string,text:string,provider:'gemini'|'fallback',now:string){
 return conversations.map(conversation=>{
  if(conversation.id!==conversationId)return conversation;
  const messages=[...conversation.messages];let index=-1;
  for(let i=messages.length-1;i>=0;i--)if(messages[i].role==='user'&&messages[i].text===userText){index=i;break;}
  const reply=index<0?-1:messages.findIndex((message,i)=>i>index&&message.role==='assistant');
  if(reply<0)return conversation;
  messages[reply]={...messages[reply],text,provider,createdAt:now};return {...conversation,messages,updatedAt:now};
 });
}
