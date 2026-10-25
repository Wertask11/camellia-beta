import {schoolParkAuth} from '../schoolpark/firebase';
import {consumeChatStream} from './stream';
import {isConversationModel} from './models';
import {safeConversationTiming,safeConversationTimeline,type ConversationTiming} from './performance';
import type {ConversationModelId} from '@/types';
export type ChatError='rate_limited'|'timeout'|'network'|'provider_error'|'disabled'|'invalid_request'|'safety_block'|'invalid_response';
export type ChatResponse={reply:string;provider:'gemini'|'fallback';responseTimeMs?:number;safety?:boolean;actionId?:string;modelId?:ConversationModelId;timing?:ConversationTiming;transport?:'sse'|'json';timeline?:Record<string,number>};
export async function requestGemini(message:string,history:Array<{role:'user'|'assistant';text:string}>,modelId:ConversationModelId,options:{signal?:AbortSignal;onText?:(text:string)=>void;onRequest?:()=>void;batch?:boolean}={}):Promise<ChatResponse>{
 const user=schoolParkAuth.currentUser;
 if(!user)throw Object.assign(new Error('AUTH_REQUIRED'),{category:'provider_error'});
 const token=await user.getIdToken();
 options.signal?.throwIfAborted();options.onRequest?.();
 let response:Response;
 try{
  response=await fetch('/api/camellia/chat',{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,Accept:options.batch?'application/json':'text/event-stream'},
   body:JSON.stringify({message,history,modelId}),signal:AbortSignal.any([AbortSignal.timeout(40000),...(options.signal?[options.signal]:[])]),
  });
 }catch(error){throw Object.assign(new Error('REQUEST_FAILED'),{category:error&&typeof error==='object'&&'name'in error&&error.name==='TimeoutError'?'timeout':'network'});}
 const stream=response.ok&&response.headers?.get('content-type')?.includes('text/event-stream');
 let result:Record<string,unknown>;
 try{result=(stream?await consumeChatStream(response,options.onText??(()=>{})):await response.json().catch(()=>({}))) as Record<string,unknown>;}
 catch(error){
  const e=error&&typeof error==='object'?error as {name?:unknown;category?:unknown;timing?:unknown}:{};
  const category=e.category??(e.name==='TimeoutError'?'timeout':e.name==='SyntaxError'?'invalid_response':'network');
  throw Object.assign(new Error('STREAM_FAILED'),{category,timing:safeConversationTiming(e.timing)});
 }
 const category=result.category||(response.status===429?'rate_limited':response.status===504?'timeout':'provider_error');
 if(!response.ok||typeof result.reply!=='string'||!result.reply.trim()||Array.from(result.reply).length>300||(result.provider!=='gemini'&&result.provider!=='fallback'))throw Object.assign(new Error('CHAT_FAILED'),{category,timing:safeConversationTiming(result.timing)});
 if(result.modelId!==undefined&&(!isConversationModel(result.modelId)||result.modelId!==modelId))throw Object.assign(new Error('INVALID_MODEL'),{category:'invalid_response'});
 return {...result,timeline:safeConversationTimeline(result.timeline),timing:safeConversationTiming(result.timing),transport:stream?'sse':'json'} as ChatResponse;
}
