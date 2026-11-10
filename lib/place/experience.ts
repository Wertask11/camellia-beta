import type {CamelliaState} from '@/types';
export type ExperienceValue='helpful'|'okay'|'not_for_me';
export type PlaceExperience={id:string;choiceId:string;placeSlug:string;placeName:string;demo:boolean;status:'considering'|'self_reported'|'removed';value?:ExperienceValue;text:string;createdAt:string;updatedAt:string};
export type ExperienceInput={choiceId:string;actual:boolean;value?:ExperienceValue;text:string;remember:boolean};
export function validPlaceExperience(v:unknown):boolean{
 if(!v||typeof v!=='object')return false;const r=v as Record<string,unknown>;
 if(r.status==='removed')return typeof r.id==='string'&&r.choiceId===''&&r.placeSlug===''&&r.placeName===''&&r.text===''&&r.value===undefined&&typeof r.createdAt==='string'&&Number.isFinite(Date.parse(r.createdAt))&&typeof r.updatedAt==='string'&&Number.isFinite(Date.parse(r.updatedAt));
 return typeof r.id==='string'&&typeof r.choiceId==='string'&&typeof r.placeSlug==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(r.placeSlug)&&typeof r.placeName==='string'&&typeof r.demo==='boolean'&&typeof r.status==='string'&&['considering','self_reported'].includes(r.status)&&!(r.demo&&r.status==='self_reported')&&typeof r.text==='string'&&r.text.length<=500&&(r.value===undefined||typeof r.value==='string'&&['helpful','okay','not_for_me'].includes(r.value))&&typeof r.createdAt==='string'&&Number.isFinite(Date.parse(r.createdAt))&&typeof r.updatedAt==='string'&&Number.isFinite(Date.parse(r.updatedAt));
}
/** A private, explicit report. Neither a verified visit nor permission to publish or train an AI. */
export function addPlaceExperience(state:CamelliaState,input:ExperienceInput,at=new Date().toISOString(),id=crypto.randomUUID()):CamelliaState{
 const choice=state.placeChoices?.find(c=>c.id===input.choiceId),text=input.text.trim();
 if(!choice||text.length>500||!text&&!input.value||choice.demo&&input.actual||input.value!==undefined&&!['helpful','okay','not_for_me'].includes(input.value))return state;
 const experience:PlaceExperience={id,choiceId:choice.id,placeSlug:choice.slug,placeName:choice.title,demo:choice.demo,status:input.actual?'self_reported':'considering',...(input.value?{value:input.value}:{}),text,createdAt:at,updatedAt:at};
 return {...state,version:4,placeExperiences:[...(state.placeExperiences??[]),experience],...(input.remember&&text?{personalMemories:[...(state.personalMemories??[]),{id:`${id}-memory`,text,source:'explicit_place' as const,createdAt:at,updatedAt:at}]}:{})};
}
