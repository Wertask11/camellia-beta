import type { CamelliaState } from '@/types';
const groups = {checkin:'checkins',action:'actions','action-feedback':'actionFeedback','saved-action':'savedActions',conversation:'aiConversations','context-memory':'contextualMemory',insight:'insights','insight-feedback':'insightFeedback',fortune:'fortunes','tree-leaf':'treeLeaves',analytics:'analyticsEvents'} as const;
export function hasPersonalData(state: CamelliaState) {
  return Boolean(state.profile.name || state.profile.birthDate || state.checkins.length || state.actions.length || state.savedActions.length || state.actionFeedback.length || state.aiConversations.length || state.contextualMemory.length || state.treeLeaves.length || state.fortunes.length || state.insights.length || state.insightFeedback.length);
}
/** Reconstruct the existing per-record archive, without synthesizing records or merging devices. */
export function restoreArchive(entries: Array<Record<string,unknown>>, base: CamelliaState): CamelliaState | null {
  const state:CamelliaState={...base,profile:{...base.profile}};
  for(const field of Object.values(groups)) state[field]=[] as never;
  let foundProfile=false;
  for(const entry of entries) {
    if(entry.source!=='camellia-beta-localStorage'||entry.truncated||typeof entry.content!=='string') continue;
    let value:Record<string,unknown>;
    try { value=JSON.parse(entry.content); } catch { throw new Error('REMOTE_ARCHIVE_INVALID'); }
    if(!value||typeof value!=='object'||Array.isArray(value)) throw new Error('REMOTE_ARCHIVE_INVALID');
    if(entry.kind==='profile') {
      if(typeof value.id!=='string'||typeof value.name!=='string'||!Array.isArray(value.interests)) throw new Error('REMOTE_PROFILE_INVALID');
      state.profile={id:'',name:'',age:'',interests:[],lifestyle:'',priority:'',periodEnabled:false,createdAt:base.createdAt,updatedAt:base.updatedAt,...value} as CamelliaState['profile'];foundProfile=true;
    } else if(entry.kind==='meta') {
      if(value.version!==3) throw new Error('REMOTE_VERSION_UNSUPPORTED');
      if(typeof value.createdAt==='string') state.createdAt=value.createdAt;
      if(typeof value.updatedAt==='string') state.updatedAt=value.updatedAt;
      state.onboardingComplete=value.onboardingComplete===true;
    } else if(typeof entry.kind==='string'&&entry.kind in groups) {
      const field=groups[entry.kind as keyof typeof groups];
      if(typeof value.createdAt!=='string'||(field==='fortunes'?typeof value.date!=='string':typeof value.id!=='string')) throw new Error('REMOTE_RECORD_INVALID');
      if(field==='checkins'&&![1,2,3,4,5].includes(value.mood as number)) throw new Error('REMOTE_CHECK_INVALID');
      if(field==='aiConversations'&&!Array.isArray(value.messages)) throw new Error('REMOTE_CONVERSATION_INVALID');
      if(field==='treeLeaves'&&(!Array.isArray(value.meaningTags)||!Array.isArray(value.reflections))) throw new Error('REMOTE_TREE_INVALID');
      if(field==='analyticsEvents'&&!value.forwardedAt)value.forwardedAt=value.createdAt;
      (state[field] as unknown as Record<string,unknown>[]).push(value);
    }
  }
  return foundProfile?state:null;
}
