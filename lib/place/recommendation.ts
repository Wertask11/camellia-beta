import type {CamelliaState} from '@/types';
import type {Place} from './model';
export type PlaceIntent='quiet'|'rest'|'try'|'move'|'together';
export const PLACE_PREFERENCES:Record<PlaceIntent,string>={quiet:'静かに過ごしたい',rest:'ゆっくり過ごしたい',try:'新しいことをしたい',move:'身体を動かしたい',together:'誰かと過ごしたい'};
/** Local inference only after explicit consent. Never includes medical fields, conversation, names or Tree. */
export function localPlaceIntents(state:CamelliaState):PlaceIntent[]{
 const result:PlaceIntent[]=[];
 const check=state.checkins.at(-1);if(check&&check.mood<=2)result.push('rest','quiet');
 for(const a of state.actions.slice(-5)){if(a.category==='BODY')result.push('move');if(a.category==='LEARN'||a.category==='PLAY')result.push('try');if(a.category==='CONNECT')result.push('together');}
 return [...new Set(result)].slice(0,3);
}
/** Sponsorship and partnership never affect rank. Catalog metadata only. */
export function rankPlaces(places:Place[],intents:PlaceIntent[]):Place[]{
 return [...places].sort((a,b)=>b.recommendedFor.filter(x=>intents.includes(x as PlaceIntent)).length-a.recommendedFor.filter(x=>intents.includes(x as PlaceIntent)).length||a.slug.localeCompare(b.slug));
}
