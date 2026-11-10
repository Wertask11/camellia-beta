import {jstDate} from '../fortune/engine.js';
import type {CamelliaState,ActionDefinition} from '@/types';
import type {Place} from './model';
export type PlaceIntent='quiet'|'rest'|'try'|'move'|'together';
export const PLACE_PREFERENCES:Record<PlaceIntent,string>={quiet:'静かに過ごしたい',rest:'ゆっくり過ごしたい',try:'新しいことをしたい',move:'身体を動かしたい',together:'誰かと過ごしたい'};
/** Explicit action → Place link, based only on a public catalog category. */
export function actionPlaceIntent(action:ActionDefinition):PlaceIntent{return action.category==='BODY'?'move':action.category==='CONNECT'?'together':action.category==='REST'||action.category==='BEAUTY'?'quiet':'try';}
/** Local inference only after explicit consent. Never includes medical fields, conversation, names or Tree. */
export function localPlaceIntents(state:CamelliaState,now=new Date()):PlaceIntent[]{
 const result:PlaceIntent[]=[];
 const check=state.checkins.filter(c=>Date.parse(c.createdAt)<=now.getTime()&&jstDate(new Date(c.createdAt))===jstDate(now)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];if(check&&check.mood<=2)result.push('rest','quiet');
 for(const a of [...state.actions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5)){if(a.category==='BODY')result.push('move');if(a.category==='LEARN'||a.category==='PLAY')result.push('try');if(a.category==='CONNECT')result.push('together');}
 return [...new Set(result)].slice(0,3);
}
/** Sponsorship and partnership never affect rank. Catalog metadata only. */
export function rankPlaces(places:Place[],intents:PlaceIntent[]):Place[]{
 return [...places].sort((a,b)=>b.recommendedFor.filter(x=>intents.includes(x as PlaceIntent)).length-a.recommendedFor.filter(x=>intents.includes(x as PlaceIntent)).length||a.slug.localeCompare(b.slug));
}
