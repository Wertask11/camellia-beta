import type {AIConversation,AIMessage} from '@/types';
import {isModelSwitchMessage,validConversationEntry} from './entries';

type StoredSwitch=AIMessage&{afterMessageCount:number};
type StoredConversation=AIConversation&{modelSwitches?:StoredSwitch[]};

/** Keep persisted messages readable by pre-v3 clients, which accept user/assistant only.
 * Typed system entries live in an additive field; the current UI reconstructs their positions.
 * Legacy records without switches retain their exact shape (no background rewrite).
 */
export function encodeConversation(conversation:AIConversation):StoredConversation{
 if(!conversation.messages.some(isModelSwitchMessage))return conversation;
 const messages:AIMessage[]=[],modelSwitches:StoredSwitch[]=[];
 for(const message of conversation.messages){
  if(isModelSwitchMessage(message))modelSwitches.push({...message,afterMessageCount:messages.length});
  else messages.push(message);
 }
 return {...conversation,messages,modelSwitches};
}
export function validStoredSwitches(value:Record<string,unknown>):boolean{
 if(value.modelSwitches===undefined)return true;
 const messages=value.messages;
 return Array.isArray(value.modelSwitches)&&Array.isArray(messages)&&value.modelSwitches.every(marker=>
  validConversationEntry(marker)&&marker.role==='system'&&Number.isInteger(marker.afterMessageCount)&&marker.afterMessageCount>=0&&marker.afterMessageCount<=messages.length);
}
export function decodeConversation(conversation:AIConversation):AIConversation{
 const {modelSwitches,...plain}=conversation as StoredConversation;
 if(modelSwitches===undefined)return conversation;
 const messages:AIMessage[]=[];
 const positions=new Map<number,AIMessage[]>();
 for(const {afterMessageCount,...marker} of modelSwitches){
  const group=positions.get(afterMessageCount)??[];group.push(marker);positions.set(afterMessageCount,group);
 }
 for(let index=0;index<=plain.messages.length;index++){
  messages.push(...positions.get(index)??[]);
  if(index<plain.messages.length)messages.push(plain.messages[index]);
 }
 return {...plain,messages};
}
export function serializeConversationState<T extends {aiConversations:AIConversation[]}>(state:T):T{
 return {...state,aiConversations:state.aiConversations.map(encodeConversation)};
}
