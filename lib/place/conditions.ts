import type {Place} from './model';
import {placeSector,type PlaceSector} from './details';
export type PlaceConditions={area?:string;sector?:PlaceSector;maxBudgetYen?:number;maxMinutes?:number;openAt?:Date;walkIn?:boolean;service?:string};
export function scheduledOpen(place:Place,at:Date){
 if(!Number.isFinite(at.getTime()))return false;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at);const get=(key:string)=>parts.find(p=>p.type===key)?.value??'';
 const dayString=`${get('year')}-${get('month')}-${get('day')}`;if(place.closedDates?.includes(dayString))return false;
 const previousDate=new Date(Date.parse(dayString+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 const day=new Date(dayString+'T00:00:00Z').getUTCDay(),minutes=Number(get('hour'))*60+Number(get('minute'));
 return place.weeklyHours?.some(h=>h.end>h.start?h.day===day&&h.start<=minutes&&minutes<h.end:(h.day===day&&h.start<=minutes)||((h.day+1)%7===day&&minutes<h.end&&!place.closedDates?.includes(previousDate)))??false;
}
/** Unknown facts do not satisfy a hard constraint. Paid status and sponsorship are not conditions. */
export function matchesPlaceConditions(p:Place,c:PlaceConditions){
 return (!c.area||p.area===c.area)&&(!c.sector||placeSector(p)===c.sector)&&(c.maxBudgetYen===undefined||(Number.isFinite(c.maxBudgetYen)&&c.maxBudgetYen>=0&&p.budget!==undefined&&p.budget.maxYen<=c.maxBudgetYen))&&(c.maxMinutes===undefined||(Number.isFinite(c.maxMinutes)&&c.maxMinutes>=0&&p.durationMinutes!==undefined&&p.durationMinutes<=c.maxMinutes))&&(!c.openAt||Number.isFinite(c.openAt.getTime())&&scheduledOpen(p,c.openAt))&&(!c.walkIn||p.reservation==='none'||p.reservation==='optional')&&(!c.service||Boolean(p.services?.includes(c.service)));
}
export function conditionFacts(p:Place){return [p.budget?`表示料金の上限 ${p.budget.maxYen.toLocaleString()}円`:p.priceRange||'価格は要確認',p.durationMinutes?`目安 ${p.durationMinutes}分`:p.duration||'所要時間は要確認',p.reservation==='required'?'予約が必要':p.reservation==='none'||p.reservation==='optional'?'予約なしの利用が可能':'予約条件は要確認'];}
