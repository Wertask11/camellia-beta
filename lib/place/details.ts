import type {Place} from './model';
export type PlaceBenefit={id:string;title:string;conditions:string;eligible:'all'|'plus';validFrom:string;validUntil:string};
export type PlaceDetails={experience?:string;services?:string[];budget?:{minYen:number;maxYen:number};durationMinutes?:number;reservation?:'required'|'optional'|'none'|'unknown';weeklyHours?:Array<{day:number;start:number;end:number}>;closedDates?:string[];contactUrl?:string;phone?:string;benefits?:PlaceBenefit[];informationCheckedAt?:string};
const fail=()=>{throw new Error('INVALID_PLACE');};
const clean=(v:unknown,max:number)=>{if(typeof v!=='string'||v.length>max)return fail();return v.trim();};
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function validatePlaceDetails(v:Record<string,unknown>):PlaceDetails{
 const result:PlaceDetails={};
 if(v.experience!==undefined)result.experience=clean(v.experience,600);
 if(v.services!==undefined){if(!Array.isArray(v.services)||v.services.length>12)fail();result.services=[...new Set((v.services as unknown[]).map(x=>clean(x,60)))].filter(Boolean);}
 if(v.budget!==undefined){if(!v.budget||typeof v.budget!=='object')fail();const b=v.budget as Record<string,unknown>;if(!Number.isSafeInteger(b.minYen)||!Number.isSafeInteger(b.maxYen)||(b.minYen as number)<0||(b.maxYen as number)<(b.minYen as number)||(b.maxYen as number)>10000000)fail();result.budget={minYen:b.minYen as number,maxYen:b.maxYen as number};}
 if(v.durationMinutes!==undefined){if(!Number.isSafeInteger(v.durationMinutes)||(v.durationMinutes as number)<1||(v.durationMinutes as number)>10080)fail();result.durationMinutes=v.durationMinutes as number;}
 if(v.reservation!==undefined){if(typeof v.reservation!=='string'||!['required','optional','none','unknown'].includes(v.reservation))fail();result.reservation=v.reservation as PlaceDetails['reservation'];}
 if(v.weeklyHours!==undefined){if(!Array.isArray(v.weeklyHours)||v.weeklyHours.length>28)fail();result.weeklyHours=(v.weeklyHours as unknown[]).map(x=>{if(!x||typeof x!=='object')return fail();const h=x as Record<string,unknown>;if(!Number.isInteger(h.day)||(h.day as number)<0||(h.day as number)>6||!Number.isInteger(h.start)||!Number.isInteger(h.end)||(h.start as number)<0||(h.start as number)>1439||(h.end as number)<1||(h.end as number)>1440||h.start===h.end)return fail();return {day:h.day as number,start:h.start as number,end:h.end as number};});}
 if(v.closedDates!==undefined){if(!Array.isArray(v.closedDates)||v.closedDates.length>90||v.closedDates.some(x=>typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||!date(x)))fail();result.closedDates=v.closedDates as string[];}
 if(v.phone!==undefined){const phone=clean(v.phone,30);if(phone&&!/^\+?[0-9][0-9 -]{7,22}$/.test(phone))fail();result.phone=phone;}
 if(v.benefits!==undefined){if(!Array.isArray(v.benefits)||v.benefits.length>5)fail();result.benefits=(v.benefits as unknown[]).map(x=>{if(!x||typeof x!=='object')return fail();const b=x as Record<string,unknown>,id=clean(b.id,80),title=clean(b.title,120),conditions=clean(b.conditions,500);if(!/^[a-z0-9-]+$/.test(id)||!title||!conditions||typeof b.eligible!=='string'||!['all','plus'].includes(b.eligible)||!date(b.validFrom)||!date(b.validUntil)||Date.parse(String(b.validUntil))<=Date.parse(String(b.validFrom)))return fail();return {id,title,conditions,eligible:b.eligible as 'all'|'plus',validFrom:String(b.validFrom),validUntil:String(b.validUntil)};});}
 return result;
}
export const PLACE_SECTORS={food:'カフェ・飲食店',beauty:'美容',relax:'リラクゼーション',experience:'体験サービス'} as const;
export type PlaceSector=keyof typeof PLACE_SECTORS;
export function placeSector(place:Pick<Place,'category'>):PlaceSector{return ['カフェ','飲食店'].includes(place.category)?'food':['美容'].includes(place.category)?'beauty':['ヘッドスパ','リラクゼーション'].includes(place.category)?'relax':'experience';}
export function availableBenefits(place:Place,now=Date.now()){return place.informationCheckedAt?(place.benefits??[]).filter(b=>Date.parse(b.validFrom)<=now&&Date.parse(b.validUntil)>now):[];}
