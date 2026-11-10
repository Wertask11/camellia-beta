import type {CamelliaState} from '@/types';
import {serializeConversationState} from '@/lib/conversation/persistence';
/** Preserve the exact v3 source before a first v4 write. A failed backup must not be bypassed by retry. */
export function persistPersonalState(state:CamelliaState,key='camellia-prototype-v3'){
 const previous=localStorage.getItem(key);
 if(state.version===4&&previous){const old=JSON.parse(previous);if(old.version===3){const owner=typeof old.profile?.id==='string'?old.profile.id:state.profile.id,backup=`camellia-local-backup:${owner}:pre-v4`;if(!localStorage.getItem(backup))localStorage.setItem(backup,previous);}}
 localStorage.setItem(key,JSON.stringify(serializeConversationState(state)));
}
