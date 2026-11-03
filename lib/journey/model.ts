import {ACTIONS} from '@/data/actions';
import type {ActionRecord, SavedAction} from '@/types';
export type PlaceChoice={id:string;slug:string;title:string;demo:boolean;createdAt:string;updatedAt:string};
export type JourneyChoices={actions?:ActionRecord[];savedActions?:SavedAction[];placeChoices?:PlaceChoice[]};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function safeJourney(value:unknown,now=Date.now()):JourneyChoices{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const fresh=(at:unknown)=>date(at)&&Date.parse(at)<=now+60000&&Date.parse(at)>=now-30*60000;
 const actions=(Array.isArray(v.actions)?v.actions:[]).slice(-12).flatMap((r:ActionRecord)=>{
  const action=ACTIONS.find(a=>a.id===r?.actionId);
  if(!action||!uuid(r.id)||!fresh(r.createdAt)||!fresh(r.updatedAt)||!['started','completed','skipped'].includes(r.status))return [];
  return [{id:r.id,actionId:action.id,title:action.title,category:action.category,status:r.status,createdAt:r.createdAt,updatedAt:r.updatedAt,...(fresh(r.startedAt)?{startedAt:r.startedAt}:{}),...(fresh(r.completedAt)?{completedAt:r.completedAt}:{})}];
 });
 const savedActions=(Array.isArray(v.savedActions)?v.savedActions:[]).slice(-12).filter((r:SavedAction)=>r&&uuid(r.id)&&ACTIONS.some(a=>a.id===r.actionId)&&fresh(r.createdAt)&&fresh(r.updatedAt)&&['later_today','holiday','when_free','save_only'].includes(r.timing)).map((r:SavedAction)=>({id:r.id,actionId:r.actionId,timing:r.timing,createdAt:r.createdAt,updatedAt:r.updatedAt}));
 const placeChoices=(Array.isArray(v.placeChoices)?v.placeChoices:[]).slice(-8).filter(validPlaceChoice).filter((r:PlaceChoice)=>fresh(r.createdAt)&&fresh(r.updatedAt)).map((r:PlaceChoice)=>({id:r.id,slug:r.slug,title:r.title,demo:r.demo,createdAt:r.createdAt,updatedAt:r.updatedAt}));
 return {actions,savedActions,placeChoices};
}
export function validPlaceChoice(v:unknown):v is PlaceChoice{
 if(!v||typeof v!=='object')return false;const r=v as PlaceChoice;
 return uuid(r.id)&&typeof r.slug==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(r.slug)&&typeof r.title==='string'&&r.title.length>0&&r.title.length<=100&&typeof r.demo==='boolean'&&date(r.createdAt)&&date(r.updatedAt);
}
