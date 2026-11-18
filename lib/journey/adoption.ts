import type {CamelliaState} from '@/types';
import {safeJourney,type JourneyChoices} from './model';
/** Catalog selections are additive; no Check is synthesized and existing IDs win. */
export function mergeJourney(state:CamelliaState,value:JourneyChoices):CamelliaState {
 const choices=safeJourney(value);
 return {...state,actions:[...state.actions,...(choices.actions??[]).filter(a=>!state.actions.some(old=>old.id===a.id))],savedActions:[...state.savedActions,...(choices.savedActions??[]).filter(a=>!state.savedActions.some(old=>old.id===a.id))],placeChoices:[...(state.placeChoices??[]),...(choices.placeChoices??[]).filter(a=>!state.placeChoices?.some(old=>old.id===a.id))]};
}
export function containsJourney(value:unknown,choices:JourneyChoices,profileId:string){
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 if(!v.profile||typeof v.profile!=='object'||(v.profile as {id?:unknown}).id!==profileId)return false;
 return (['actions','savedActions','placeChoices'] as const).every(key=>(choices[key]??[]).every(a=>Array.isArray(v[key])&&(v[key] as Array<{id?:unknown}>).some(old=>old?.id===a.id)));
}
