import {recommend} from './engine';
import {jstDate} from '@/lib/fortune/engine';
import type {CamelliaState,Category} from '@/types';
export type RecommendationFilter={category?:Category;maxMinutes?:number};
/** A previous Check is not today's condition. Manual limits are never silently relaxed. */
export function adjustedRecommendations(state:CamelliaState,filter:RecommendationFilter={},now=new Date()){
 if(filter.maxMinutes!==undefined&&(!Number.isFinite(filter.maxMinutes)||filter.maxMinutes<0))return [];
 const input={...state,checkins:state.checkins.filter(c=>jstDate(new Date(c.createdAt))===jstDate(now))};
 return recommend(input,now,filter.category,200).filter(r=>filter.maxMinutes===undefined||r.action.minutes<=filter.maxMinutes).slice(0,3).map(r=>({...r,reasons:filter.maxMinutes!==undefined?[`選んだ${filter.maxMinutes}分以内の過ごし方`,...r.reasons]:r.reasons}));
}
