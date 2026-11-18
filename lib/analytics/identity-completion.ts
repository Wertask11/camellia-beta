import {currentAnalyticsSession} from './session';
import type {AnalyticsEvent} from '@/types';

export const ID_COMPLETION_KEY='camellia-id-completion-v1';
const TTL=10*60*1000;
type Pending={uid:string;at:number;event:AnalyticsEvent};
/** Local, per-tab handoff only. The UID is never part of an analytics event. */
export function stageIdentityCompletion(uid:string,method:'email'|'line'|'google',linked:boolean,storage:Storage,now=Date.now()){
 try{
  const session=currentAnalyticsSession();
  const pending:Pending={uid,at:now,event:{id:crypto.randomUUID(),name:'camellia_id_complete',createdAt:new Date(now).toISOString(),properties:{method,id_operation:linked?'link':'access',experience_version:'free_id_v1',id_state:method==='email'?'obtained':'legacy_external',...(/^[0-9a-f-]{36}$/.test(session)?{entry_session:session}:{})}}};
  storage.setItem(ID_COMPLETION_KEY,JSON.stringify(pending));
 }catch{/* Measurement must never block successful authentication. */}
}
export function readIdentityCompletion(uid:string,storage:Storage,now=Date.now()):AnalyticsEvent|undefined{
 try{
  const pending=JSON.parse(storage.getItem(ID_COMPLETION_KEY)||'null') as Pending|null;
  if(!pending||!Number.isFinite(pending.at)||pending.at>now||now-pending.at>=TTL){storage.removeItem(ID_COMPLETION_KEY);return;}
  if(pending.uid!==uid)return;
  const event=pending.event,props=event?.properties;
  if(event?.name!=='camellia_id_complete'||!/^[0-9a-f-]{36}$/.test(event.id)||!Number.isFinite(Date.parse(event.createdAt))||!['email','line','google'].includes(String(props?.method))||!['access','link'].includes(String(props?.id_operation)))return;
  // Project the allowlist again; local metadata/UID cannot leak through a tampered row.
  return {id:event.id,name:'camellia_id_complete',createdAt:event.createdAt,properties:{method:String(props!.method),id_operation:String(props!.id_operation),experience_version:'free_id_v1',id_state:props!.method==='email'?'obtained':'legacy_external',...(/^[0-9a-f-]{36}$/.test(String(props!.entry_session))?{entry_session:String(props!.entry_session)}:{})}};
 }catch{return;}
}
/** Clear only after the corresponding event is present in the persisted account ledger. */
export function finishIdentityCompletion(uid:string,id:string,storage:Storage){
 try{const p=JSON.parse(storage.getItem(ID_COMPLETION_KEY)||'null') as Pending|null;if(p?.uid===uid&&p.event?.id===id)storage.removeItem(ID_COMPLETION_KEY);}catch{/* Expiry bounds transient metadata. */}
}
