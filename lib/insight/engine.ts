import { ACTIONS } from '@/data/actions';
import type { CamelliaState, Insight } from '@/types';

const make=(key:string,text:string,sampleSize:number,confidence:number):Insight=>({id:key,key,text,sampleSize,confidence,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
export function generateInsights(state:CamelliaState):Insight[]{
  if(state.contextualMemory.length<6||state.checkins.length<4)return [];
  const rejected=new Set(state.insightFeedback.filter(f=>f.verdict==='incorrect').map(f=>f.insightKey));
  const out:Insight[]=[];
  for(const action of ACTIONS){
    const good=state.contextualMemory.filter(m=>m.actionId===action.id&&m.event==='feedback'&&(m.feedback==='great'||m.feedback==='okay'));
    if(good.length>=3){const short=good.filter(m=>(m.context.sleep??99)<6).length;if(short>=2){const key=`short-sleep-${action.id}`;if(!rejected.has(key))out.push(make(key,`睡眠が短い日は、「${action.title}」の後の評価が良いことが多いみたいです。`,good.length,.65))}}
    const saved=state.contextualMemory.filter(m=>m.actionId===action.id&&m.event==='saved').length;const done=state.contextualMemory.filter(m=>m.actionId===action.id&&m.event==='completed').length;
    if(saved>=3&&done===0){const key=`saved-not-done-${action.id}`;if(!rejected.has(key))out.push(make(key,`「${action.title}」を${saved}回保存していますが、まだ実行していません。興味はあるけれど、時間を取りにくいのかもしれません。`,saved,.55))}
  }
  const restNights=state.contextualMemory.filter(m=>m.event==='started'&&m.context.timeBand==='夜'&&ACTIONS.find(a=>a.id===m.actionId)?.category==='REST');
  if(restNights.length>=3){const key='rest-at-night';if(!rejected.has(key))out.push(make(key,'夜は、休息につながる行動を選ぶことが多いみたいです。',restNights.length,.6))}
  return out.slice(0,4);
}
