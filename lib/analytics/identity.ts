import {captureAuthEvent} from './posthog';
import {currentAnalyticsSession} from './session';
import {FREE_STORAGE_KEY} from '../free/storage-key';
import {readFreeTransfer} from '../free/handover';
/** Never inspect a previous account's cache and never alias the pre-ID person to an account. */
export function identityEvent(name:'camellia_id_prompt_view'|'camellia_id_start'|'camellia_id_complete'|'camellia_id_error',method?:'email'|'line'|'google',linked=false){
 try{
  const source=JSON.parse(localStorage.getItem(FREE_STORAGE_KEY)||'null');let id=source?.profile?.id;
  if(typeof id!=='string'){id=sessionStorage.getItem('camellia-id-analytics-attempt');if(!id){id=crypto.randomUUID();sessionStorage.setItem('camellia-id-analytics-attempt',id);}}
  const session=readFreeTransfer(localStorage)?.entrySession||currentAnalyticsSession();
  captureAuthEvent(name,{experience_version:'free_id_v1',...(name==='camellia_id_complete'?{id_state:method==='email'?'obtained':'legacy_external'}:{id_state:'none'}),...(method?{method}:{}),...(session?{entry_session:session}:{}),...(name==='camellia_id_error'?{reason:'unknown'}:{}),id_operation:linked?'link':'access'},id);
 }catch{/* Analytics cannot block saving or identity verification. */}
}
