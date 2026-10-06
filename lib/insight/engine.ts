import { ACTIONS } from '@/data/actions';
import { generateInsightCandidates } from '@/lib/insight/candidates';
import { jstDate } from '@/lib/fortune/engine';
import type { CamelliaState, Insight } from '@/types';

const make=(key:string,text:string,sampleSize:number,confidence:number):Insight=>({id:key,key,text,sampleSize,confidence,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
export function generateInsights(state:CamelliaState):Insight[]{
  const rejected=new Set(state.insightFeedback.filter(f=>f.verdict==='incorrect').map(f=>f.insightKey));
  const out:Insight[] = generateInsightCandidates(state)
    .filter(candidate => !rejected.has(candidate.key))
    .map(candidate => make(candidate.key, candidate.text, candidate.observations, candidate.confidence));
  for(const action of ACTIONS){
    const savedDays=new Set(state.contextualMemory.filter(m=>m.actionId===action.id&&m.event==='saved').map(m=>jstDate(new Date(m.createdAt))));
    const started=state.contextualMemory.some(m=>m.actionId===action.id&&(m.event==='started'||m.event==='completed'));
    if(savedDays.size>=3&&!started){const key=`saved-not-done-${action.id}`;if(!rejected.has(key))out.push(make(key,`「${action.title}」を別々の日に保存しています。気になっているのか、今は始めるタイミングを探しているのかもしれません。`,savedDays.size,.56))}
  }
  return out.sort((a,b)=>b.confidence-a.confidence||b.sampleSize-a.sampleSize).slice(0,4);
}
