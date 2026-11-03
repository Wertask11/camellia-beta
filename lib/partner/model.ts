import {ACTIONS} from '../../data/actions.js';
export const FEELING_MESSAGES={listen:'今日は話を聞いてほしい',alone:'少し一人でいたい',together:'一緒にいたい',gentle:'今日はそっとしてほしい'} as const;
export type ShareKind='feeling'|'action'|'place';
export type ShareInput={kind:ShareKind;feelingId?:keyof typeof FEELING_MESSAGES;actionId?:string;placeSlug?:string;recipient:'partner'|'trusted_person';timing:'today'|'someday';days:1|7;consent:true};
export type PublicShare={kind:ShareKind;title:string;description:string;timing:'today'|'someday';expiresAt:string;demo:boolean;placeSlug?:string};
export function validateShare(value:unknown):ShareInput{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('INVALID_SHARE');
 const v=value as Record<string,unknown>;
 const allowed=['operation','kind','feelingId','actionId','placeSlug','recipient','timing','days','consent'];
 if(Object.keys(v).some(k=>!allowed.includes(k))||v.consent!==true||!['partner','trusted_person'].includes(String(v.recipient))||!['today','someday'].includes(String(v.timing))||![1,7].includes(v.days as number))throw new Error('INVALID_SHARE');
 if(v.kind==='feeling'&&(typeof v.feelingId!=='string'||!Object.hasOwn(FEELING_MESSAGES,v.feelingId)))throw new Error('INVALID_SHARE');
 if(v.kind==='action'&&(typeof v.actionId!=='string'||!ACTIONS.some(a=>a.id===v.actionId)))throw new Error('INVALID_SHARE');
 if(v.kind==='place'&&(typeof v.placeSlug!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(v.placeSlug)))throw new Error('INVALID_SHARE');
 if(!['feeling','action','place'].includes(String(v.kind)))throw new Error('INVALID_SHARE');
 return {kind:v.kind as ShareKind,recipient:v.recipient as ShareInput['recipient'],timing:v.timing as ShareInput['timing'],days:v.days as 1|7,consent:true,...(v.kind==='feeling'?{feelingId:v.feelingId as ShareInput['feelingId']}:{}),...(v.kind==='action'?{actionId:v.actionId as string}:{}),...(v.kind==='place'?{placeSlug:v.placeSlug as string}:{})};
}
