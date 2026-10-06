import type { CamelliaState } from '@/types';
const groups = {checkin:'checkins',action:'actions','action-feedback':'actionFeedback','saved-action':'savedActions',conversation:'aiConversations','context-memory':'contextualMemory','personal-memory':'personalMemories',insight:'insights','insight-feedback':'insightFeedback',fortune:'fortunes','tree-leaf':'treeLeaves',analytics:'analyticsEvents'} as const;
export function hasPersonalData(state: CamelliaState) {
  return Boolean(state.profile.name || state.profile.birthDate || state.profile.age || state.profile.lifestyle || state.profile.priority || state.profile.interests.length || state.profile.periodEnabled || state.profile.region || state.profile.livingSituation || state.profile.concerns || state.profile.purposes?.length || state.profile.usualSleep!==undefined || state.checkins.length || state.actions.length || state.savedActions.length || state.actionFeedback.length || state.aiConversations.length || state.contextualMemory.length || state.treeLeaves.length || state.fortunes.length || state.insights.length || state.insightFeedback.length || state.personalMemories?.length);
}
/** Reconstruct the existing per-record archive, without synthesizing records or merging devices. */
export function restoreArchive(entries: Array<Record<string,unknown>>, base: CamelliaState): CamelliaState | null {
  const state:CamelliaState={...base,profile:{...base.profile}};
  for(const field of Object.values(groups)) state[field]=[] as never;
  let foundProfile=false,foundMeta=false;
  const metaEntry=entries.find(entry=>entry.source==='camellia-beta-localStorage'&&entry.kind==='meta');
  let expected:Set<string>|undefined;
  if(metaEntry&&typeof metaEntry.content==='string'){
    let meta;try{meta=JSON.parse(metaEntry.content);}catch{throw new Error('REMOTE_ARCHIVE_INVALID');}
    if(meta.archiveKeys!==undefined){
      if(!Array.isArray(meta.archiveKeys)||meta.archiveKeys.some((key:unknown)=>typeof key!=='string')||new Set(meta.archiveKeys).size!==meta.archiveKeys.length)throw new Error('REMOTE_ARCHIVE_INVALID');
      expected=new Set(meta.archiveKeys as string[]);
    }
  }
  const seen=new Set<string>();
  for(const entry of entries) {
    if(entry.source!=='camellia-beta-localStorage')continue;
    if(expected){
      if(typeof entry.archiveKey!=='string'||!expected.has(entry.archiveKey))continue;
      if(seen.has(entry.archiveKey))throw new Error('REMOTE_ARCHIVE_INVALID');
      seen.add(entry.archiveKey);
    }
    if(entry.truncated||typeof entry.content!=='string')throw new Error('REMOTE_ARCHIVE_INCOMPLETE');
    let value:Record<string,unknown>;
    try { value=JSON.parse(entry.content); } catch { throw new Error('REMOTE_ARCHIVE_INVALID'); }
    if(!value||typeof value!=='object'||Array.isArray(value)) throw new Error('REMOTE_ARCHIVE_INVALID');
    if(entry.kind==='profile') {
      if(typeof value.id!=='string'||typeof value.name!=='string'||!Array.isArray(value.interests)) throw new Error('REMOTE_PROFILE_INVALID');
      state.profile={id:'',name:'',age:'',interests:[],lifestyle:'',priority:'',periodEnabled:false,createdAt:base.createdAt,updatedAt:base.updatedAt,...value} as CamelliaState['profile'];foundProfile=true;
    } else if(entry.kind==='meta') {
      if(value.version!==3) throw new Error('REMOTE_VERSION_UNSUPPORTED');
      foundMeta=true;
      if(typeof value.createdAt==='string') state.createdAt=value.createdAt;
      if(typeof value.updatedAt==='string') state.updatedAt=value.updatedAt;
      state.onboardingComplete=value.onboardingComplete===true;
    } else if(typeof entry.kind==='string'&&Object.hasOwn(groups,entry.kind)) {
      const field=groups[entry.kind as keyof typeof groups];
      if(typeof value.createdAt!=='string'||(field==='fortunes'?typeof value.date!=='string':typeof value.id!=='string')) throw new Error('REMOTE_RECORD_INVALID');
      if(field==='checkins'&&![1,2,3,4,5].includes(value.mood as number)) throw new Error('REMOTE_CHECK_INVALID');
      if(field==='aiConversations'&&!Array.isArray(value.messages)) throw new Error('REMOTE_CONVERSATION_INVALID');
      if(field==='treeLeaves'&&(!Array.isArray(value.meaningTags)||!Array.isArray(value.reflections))) throw new Error('REMOTE_TREE_INVALID');
      if(!Number.isFinite(Date.parse(value.createdAt as string)))throw new Error('REMOTE_RECORD_INVALID');
      if(field==='actions'&&(typeof value.actionId!=='string'||typeof value.title!=='string'||!['REST','BODY','BEAUTY','PLAY','LEARN','CONNECT'].includes(value.category as string)||!['started','completed','skipped'].includes(value.status as string)))throw new Error('REMOTE_ACTION_INVALID');
      if(field==='aiConversations'&&(value.messages as Record<string,unknown>[]).some(item=>!item||typeof item.id!=='string'||typeof item.text!=='string'||!['user','assistant'].includes(item.role as string)||typeof item.createdAt!=='string'))throw new Error('REMOTE_CONVERSATION_INVALID');
      if(field==='contextualMemory'&&(!value.context||typeof value.actionId!=='string'||typeof value.event!=='string'))throw new Error('REMOTE_MEMORY_INVALID');
      if(field==='treeLeaves'&&(typeof value.name!=='string'||typeof value.note!=='string'||!['active','memory'].includes(value.status as string)||(value.reflections as Record<string,unknown>[]).some(item=>!item||typeof item.text!=='string'||typeof item.createdAt!=='string')))throw new Error('REMOTE_TREE_INVALID');
      if(field==='fortunes'&&(!['drawn','skipped'].includes(value.status as string)||typeof value.cardId!=='string'))throw new Error('REMOTE_FORTUNE_INVALID');
      if(field==='personalMemories'&&(typeof value.text!=='string'||value.source!=='explicit_conversation'))throw new Error('REMOTE_MEMORY_INVALID');
      if(field==='analyticsEvents'&&typeof value.name!=='string')throw new Error('REMOTE_ANALYTICS_INVALID');
      if(field==='analyticsEvents'&&!value.forwardedAt)value.forwardedAt=value.createdAt;
      (state[field] as unknown as Record<string,unknown>[]).push(value);
    }
  }
  if((foundProfile&&!foundMeta)||(expected&&seen.size!==expected.size))throw new Error('REMOTE_ARCHIVE_INCOMPLETE');
  return foundProfile?state:null;
}
