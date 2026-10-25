import {parseConversationReply} from './action-bridge.js';
import {isConversationReaction,type ConversationReaction} from './reactions.js';

/** Only the reply JSON string is previewed. Never expose raw JSON, escapes, action IDs or thoughts. */
export function partialReply(raw:string):string {
  const prefix=raw.match(/^\s*\{\s*(?:"reaction"\s*:\s*"[a-z]*"\s*,\s*)?"reply"\s*:\s*"/);
  if(!prefix)return '';
  let result='';
  for(let i=prefix[0].length;i<raw.length;i++){
    let c=raw[i];
    if(c==='"')break;
    if(c==='\\'){
      c=raw[++i];if(c===undefined)break;
      if(c==='u'){
        const hex=raw.slice(i+1,i+5);if(!/^[\da-f]{4}$/i.test(hex))break;
        result+=String.fromCharCode(parseInt(hex,16));i+=4;continue;
      }
      const escapes:Record<string,string>={'"':'"','\\':'\\','/':'/','n':'\n','r':'\r','t':'\t','b':'\b','f':'\f'};
      if(!(c in escapes))break;result+=escapes[c];
    }else{if(c.charCodeAt(0)<32)break;result+=c;}
  }
  // A split Unicode surrogate must not briefly render as a replacement character.
  if(/[\uD800-\uDBFF]$/.test(result))result=result.slice(0,-1);
  return Array.from(result.trimStart()).slice(0,300).join('');
}
/** The reaction, as soon as the model has written it (it comes before the reply). */
export function partialReaction(raw:string):ConversationReaction|undefined{
  const value=raw.match(/^\s*\{\s*"reaction"\s*:\s*"([a-z]+)"/)?.[1];
  return isConversationReaction(value)?value:undefined;
}
type StreamChunk={text?:string;promptFeedback?:{blockReason?:unknown};candidates?:{finishReason?:unknown}[]};
const blocked=new Set(['SAFETY','PROHIBITED_CONTENT','BLOCKLIST','SPII','RECITATION','IMAGE_SAFETY']);
/** Reject blocked chunks BEFORE previewing their text; final parsed reply remains authoritative. */
export async function collectReplyStream(chunks:AsyncIterable<StreamChunk>,onText:(text:string)=>void,onFirst:()=>void,signal:AbortSignal,onReaction?:(reaction:ConversationReaction)=>void){
  let raw='',last='',first=false,reacted=false;
  for await(const chunk of chunks){
    signal.throwIfAborted();
    if(chunk.promptFeedback?.blockReason||chunk.candidates?.some(c=>blocked.has(String(c.finishReason))))throw Object.assign(new Error('GENERATION_BLOCKED'),{code:'SAFETY_BLOCK'});
    if(!chunk.text)continue;
    if(!first){first=true;onFirst();}
    raw+=chunk.text;
    if(raw.length>16000)throw Object.assign(new Error('GENERATION_TOO_LARGE'),{code:'INVALID_RESPONSE'});
    if(!reacted&&onReaction){const reaction=partialReaction(raw);if(reaction){reacted=true;onReaction(reaction);}}
    const text=partialReply(raw);
    if(text&&text!==last){last=text;onText(text);}
  }
  signal.throwIfAborted();
  parseConversationReply(raw,'');
  return raw;
}

/** SSE parser handles arbitrary UTF-8/frame boundaries; missing done is a failure, never a partial success. */
export async function consumeChatStream(response:Response,onText:(text:string)=>void,onReaction?:(reaction:ConversationReaction)=>void):Promise<Record<string,unknown>>{
  if(!response.body)throw Object.assign(new Error('NO_STREAM'),{category:'network'});
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',done:Record<string,unknown>|undefined;
  try{
    while(true){
      const part=await reader.read();buffer=(buffer+decoder.decode(part.value,{stream:!part.done})).replace(/\r\n/g,'\n');
      if(buffer.length>64000)throw Object.assign(new Error('INVALID_STREAM'),{category:'invalid_response'});
      let boundary;
      while((boundary=buffer.indexOf('\n\n'))>=0){
        const frame=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);
        const data=frame.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!data)continue;
        const event=JSON.parse(data) as Record<string,unknown>;
        if(done)throw Object.assign(new Error('EVENT_AFTER_DONE'),{category:'invalid_response'});
        if(event.type==='reaction'){
          if(isConversationReaction(event.reaction))onReaction?.(event.reaction);
        }else if(event.type==='delta'){
          if(typeof event.text!=='string'||Array.from(event.text).length>300)throw Object.assign(new Error('INVALID_DELTA'),{category:'invalid_response'});
          onText(event.text);
        }else if(event.type==='error'){
          const allowed=['rate_limited','timeout','network','provider_error','disabled','invalid_request','safety_block','invalid_response'];
          throw Object.assign(new Error('CHAT_FAILED'),{category:allowed.includes(String(event.category))?event.category:'provider_error',timing:event.timing});
        }else if(event.type==='done')done=event;
      }
      if(part.done)break;
    }
    if(!done)throw Object.assign(new Error('INTERRUPTED_STREAM'),{category:'network'});
    return done;
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
