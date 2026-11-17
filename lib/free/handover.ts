import {currentAnalyticsSession} from '../analytics/session';
import {validateStoredState} from '../storage/validation';
import {mergePersonalBackup} from '../storage/backup';
import {FREE_STORAGE_KEY} from './storage-key';
import type {CamelliaState} from '@/types';
export const FREE_TRANSFER_KEY='camellia-free-transfer-v1';
const PREFIX='camellia-free-transfer-source:';
const TTL=10*60*1000;
export type FreeTransfer={entrySession?:string;version:1;nonce:string;method:'email'|'line'|'google';sourceProfileId:string;at:number;expiresAt:number;stage:'awaiting'|'bound'|'applying'|'applied';uid?:string};
export function readFreeTransfer(storage:Storage):FreeTransfer|undefined{
 try{const p=JSON.parse(storage.getItem(FREE_TRANSFER_KEY)||'null');if(p?.version===1&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(p.nonce)&&typeof p.sourceProfileId==='string'&&['email','line','google'].includes(p.method)&&['awaiting','bound','applying','applied'].includes(p.stage)&&typeof p.at==='number'&&typeof p.expiresAt==='number'&&p.expiresAt<=p.at+TTL&&(p.stage==='awaiting'||typeof p.uid==='string'))return p;}catch{/* Preserve personal source even when transient metadata cannot be read. */}
}
export function beginFreeTransfer(method:FreeTransfer['method'],storage:Storage,now=Date.now()){
 const previous=readFreeTransfer(storage);if(previous&&previous.stage!=='awaiting')return previous; // Reauthentication must remain possible while a protected recovery is pending.
 if(previous){const saved=storage.getItem(PREFIX+previous.nonce);if(saved&&saved!==storage.getItem(FREE_STORAGE_KEY)&&JSON.parse(saved).profile?.id!==previous.sourceProfileId)throw new Error('TRANSFER_INVALID_SOURCE');}
 const raw=storage.getItem(FREE_STORAGE_KEY);if(!raw)return;
 const value=JSON.parse(raw);if(typeof value?.profile?.id!=='string')throw new Error('TRANSFER_INVALID_SOURCE');
 if(previous&&previous.sourceProfileId!==value.profile.id)throw new Error('TRANSFER_SOURCE_CHANGED');
 const p:FreeTransfer={version:1,nonce:previous?previous.nonce:crypto.randomUUID(),method,sourceProfileId:value.profile.id,...(/^[0-9a-f-]{36}$/.test(currentAnalyticsSession())?{entrySession:currentAnalyticsSession()}:{}),at:now,expiresAt:now+TTL,stage:'awaiting'};
 storage.setItem(PREFIX+p.nonce,raw);storage.setItem(FREE_TRANSFER_KEY,JSON.stringify(p));return p;
}
export function bindFreeTransfer(uid:string,method:FreeTransfer['method'],storage:Storage,now=Date.now()){
 const p=readFreeTransfer(storage);if(!p)return;
 if(p.stage!=='awaiting'){if(p.uid===uid)return p;throw new Error('TRANSFER_AUTH_MISMATCH');}
 if(p.expiresAt<=now||p.method!==method)throw new Error('TRANSFER_AUTH_MISMATCH');
 const next:FreeTransfer={...p,stage:'bound',uid};storage.setItem(FREE_TRANSFER_KEY,JSON.stringify(next));return next;
}
export function prepareFreeTransfer(current:CamelliaState,uid:string,storage:Storage,now=Date.now()){
 const p=readFreeTransfer(storage);if(!p||p.uid!==uid||p.stage==='awaiting'||(p.stage==='bound'&&p.expiresAt<=now))throw new Error('TRANSFER_AUTH_MISMATCH');
 const raw=storage.getItem(PREFIX+p.nonce);if(!raw||raw.length>10*1024*1024)throw new Error('TRANSFER_SOURCE_MISSING');
 const checked=validateStoredState(JSON.parse(raw),current);if(checked.issues.length||checked.state.profile.id!==p.sourceProfileId)throw new Error('TRANSFER_INVALID_SOURCE');
 if(p.stage==='bound'&&storage.getItem(FREE_STORAGE_KEY)!==raw)throw new Error('TRANSFER_SOURCE_CHANGED');
 // Existing account settings and tombstones win. Matching dates cannot create a second Fortune.
 const projection={...checked.state,profile:{...checked.state.profile,id:current.profile.id},fortunes:checked.state.fortunes.filter(f=>!current.fortunes.some(old=>old.date===f.date))};
 const merged=mergePersonalBackup(current,projection);
 const counts={checks:checked.state.checkins.length,conversations:checked.state.aiConversations.length,memories:checked.state.personalMemories?.length??0,tree:checked.state.treeLeaves.length,reflections:checked.state.placeExperiences?.filter(e=>e.status!=='removed').length??0,choices:checked.state.actions.length+checked.state.savedActions.length+(checked.state.placeChoices?.length??0)};
 return {intent:p,raw,projection,merged,counts};
}
/** Quarantine before applying: signing out must not reveal migrated records as a fresh Free journal. */
export function protectFreeSource(plan:ReturnType<typeof prepareFreeTransfer>,uid:string,storage:Storage){
 const live=readFreeTransfer(storage);if(live?.uid!==uid||live.nonce!==plan.intent.nonce)throw new Error('TRANSFER_AUTH_MISMATCH');
 if(live.stage==='bound'&&storage.getItem(FREE_STORAGE_KEY)!==plan.raw)throw new Error('TRANSFER_SOURCE_CHANGED');
 storage.setItem(FREE_TRANSFER_KEY,JSON.stringify({...live,stage:'applying'}));
 if(storage.getItem(FREE_STORAGE_KEY)===plan.raw)storage.removeItem(FREE_STORAGE_KEY);
}
export function markFreeTransferApplied(uid:string,nonce:string,storage:Storage){const p=readFreeTransfer(storage);if(p?.uid!==uid||p.nonce!==nonce||p.stage!=='applying')throw new Error('TRANSFER_AUTH_MISMATCH');storage.setItem(FREE_TRANSFER_KEY,JSON.stringify({...p,stage:'applied'}));}
/** Only after a separate cloud containment check; expiresAt alone must never erase the private backup. */
export function finishFreeTransfer(uid:string,nonce:string,storage:Storage,targetProfileId:string){const p=readFreeTransfer(storage);if(p?.uid!==uid||p.nonce!==nonce||p.stage!=='applied')throw new Error('TRANSFER_AUTH_MISMATCH');if(!targetProfileId)throw new Error('TRANSFER_AUTH_MISMATCH');const receipts=readAdoptedFreeSources(uid,storage);storage.setItem(ADOPTED_PREFIX+uid,JSON.stringify([...receipts.filter(r=>r.sourceProfileId!==p.sourceProfileId),{sourceProfileId:p.sourceProfileId,targetProfileId}]));storage.removeItem(PREFIX+p.nonce);storage.removeItem(FREE_TRANSFER_KEY);}
export function cancelFreeTransfer(storage:Storage){const p=readFreeTransfer(storage);if(!p||p.stage==='applying'||p.stage==='applied')return;if(storage.getItem(FREE_STORAGE_KEY)!==storage.getItem(PREFIX+p.nonce))return;storage.removeItem(PREFIX+p.nonce);storage.removeItem(FREE_TRANSFER_KEY);}
export function clearOwnedFreeTransfer(uid:string,storage:Storage){for(const key of adoptedFreeBackupKeys(uid,storage))storage.removeItem(key);storage.removeItem(ADOPTED_PREFIX+uid);const p=readFreeTransfer(storage);if(p?.uid!==uid)return;storage.removeItem(PREFIX+p.nonce);storage.removeItem(FREE_TRANSFER_KEY);}

export function clearUnadoptedFreeTransfer(sourceProfileId:string,storage:Storage){const p=readFreeTransfer(storage);if(p?.sourceProfileId!==sourceProfileId||p.stage==='applying'||p.stage==='applied')return;storage.removeItem(PREFIX+p.nonce);storage.removeItem(FREE_TRANSFER_KEY);}

export function refreshBoundFreeSource(uid:string,storage:Storage,now=Date.now()){const p=readFreeTransfer(storage);if(p?.uid!==uid||p.stage!=='bound')throw new Error('TRANSFER_AUTH_MISMATCH');const raw=storage.getItem(FREE_STORAGE_KEY);if(!raw||JSON.parse(raw).profile?.id!==p.sourceProfileId)throw new Error('TRANSFER_SOURCE_CHANGED');storage.setItem(PREFIX+p.nonce,raw);storage.setItem(FREE_TRANSFER_KEY,JSON.stringify({...p,at:now,expiresAt:now+TTL}));}

const ADOPTED_PREFIX='camellia-free-adopted-sources-v1:';
/** Local lineage only: enables owner-scoped export/deletion of retained pre-ID tab copies. */
export function readAdoptedFreeSources(uid:string,storage:Storage):Array<{sourceProfileId:string;targetProfileId:string}>{
 const raw=storage.getItem(ADOPTED_PREFIX+uid);if(!raw)return [];const entries=JSON.parse(raw);
 if(!Array.isArray(entries)||entries.some(e=>!e||typeof e.sourceProfileId!=='string'||!e.sourceProfileId||typeof e.targetProfileId!=='string'||!e.targetProfileId))throw new Error('TRANSFER_INVALID_SOURCE');return entries;
}
export function adoptedFreeBackupKeys(uid:string,storage:Storage){const owners=readAdoptedFreeSources(uid,storage).map(e=>e.sourceProfileId);return Object.keys(storage).filter(key=>owners.some(id=>key.startsWith(`camellia-local-backup:${id}:`)));}
