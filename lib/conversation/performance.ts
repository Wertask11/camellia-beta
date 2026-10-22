/** Numeric operational metadata only: no prompt, account, thread or message identifiers. */
export const PERFORMANCE_KEYS = ['client_send_to_request_ms','client_first_visible_ms','client_full_response_ms','client_response_complete_ms',
  'server_auth_ms','server_rate_limit_ms','server_context_ms','server_pre_generation_ms','server_import_ms',
  'provider_first_chunk_ms','provider_total_ms'] as const;
export type PerformanceKey = typeof PERFORMANCE_KEYS[number];
export type ConversationTiming = Partial<Record<PerformanceKey, number>>;
export function safeConversationTiming(value: unknown): ConversationTiming {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(PERFORMANCE_KEYS.flatMap(key => {
    const n = (value as Record<string, unknown>)[key];
    return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 120000 ? [[key, Math.round(n)]] : [];
  }));
}
declare const __CAMELLIA_ANALYTICS_DIAGNOSTICS__: boolean;
const enabled = typeof __CAMELLIA_ANALYTICS_DIAGNOSTICS__ !== 'undefined' && __CAMELLIA_ANALYTICS_DIAGNOSTICS__;
const samples: Array<{at:string;model:string;transport:string;timing:ConversationTiming;timeline?:Record<string,number>}> = [];
export function conversationPerformance(model:string,transport:string,timing:ConversationTiming,timeline?:Record<string,number>) {
  if (!enabled || typeof window === 'undefined') return;
  samples.push({at:new Date().toISOString(),model,transport,timing:safeConversationTiming(timing),...(timeline?{timeline:safeConversationTimeline(timeline)}:{})});
  if(samples.length>20)samples.shift();
  Object.defineProperty(window,'__CAMELLIA_CONVERSATION_PERFORMANCE__',{configurable:true,get:()=>samples.map(s=>({...s,timing:{...s.timing}}))});
}

/** Same-origin Preview-only A/B measurement; never changes provider configuration. */
export function previewBatchTransport(){return enabled&&typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('conversation-transport')==='batch';}

/** Two animation frames approximate a committed paint; the fallback is only for DOM unit environments. */
export function afterConversationPaint(callback:()=>void){
  let cancelled=false,first=0,second=0;
  if(typeof requestAnimationFrame==='function')first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{if(!cancelled)callback();});});
  else queueMicrotask(()=>{if(!cancelled)callback();});
  return ()=>{cancelled=true;if(typeof cancelAnimationFrame==='function'){cancelAnimationFrame(first);cancelAnimationFrame(second);}};
}

export function safeConversationTimeline(value:unknown):Record<string,number>{
 if(!value||typeof value!=='object')return {};
 return Object.fromEntries(['T0','T1','T2','T3','T4','T5','T6','T7','T8','T9','T9_server'].flatMap(key=>{
  const n=(value as Record<string,unknown>)[key];return typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e14?[[key,n]]:[];
 }));
}
