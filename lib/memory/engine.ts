import type { ActionContext, CamelliaState, ContextualActionMemory } from '@/types';

const band=(d:Date)=>d.getHours()<11?'朝':d.getHours()<15?'昼':d.getHours()<19?'夕方':'夜';

export function captureContext(state:CamelliaState,date=new Date()):ActionContext {
  const check=[...state.checkins].filter(c=>new Date(c.createdAt)<=date).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  return { mood:check?.mood,sleep:check?.sleep,body:check?.body,stress:check?.stress,periodDays:state.profile.periodEnabled?check?.periodDays:undefined,timeBand:band(date),weekday:date.getDay(),lifestyle:state.profile.lifestyle,availableMinutes:state.profile.availableMinutes };
}

export function recentMemories(state:CamelliaState,actionId:string,days=14,date=new Date()):ContextualActionMemory[]{
  const after=date.getTime()-days*86400000;
  return state.contextualMemory.filter(m=>m.actionId===actionId&&new Date(m.createdAt).getTime()>=after);
}

export function decayedFeedbackScore(state:CamelliaState,actionId:string,date=new Date()) {
  const memories=recentMemories(state,actionId,60,date).filter(m=>m.event==='feedback'&&m.feedback);
  if(memories.length<2)return 0;
  const weighted=memories.reduce((sum,m)=>{const age=(date.getTime()-new Date(m.createdAt).getTime())/86400000;const decay=Math.exp(-age/30);const value={great:1,okay:.3,same:0,bad:-1}[m.feedback!];return sum+value*decay},0);
  return Math.max(-2.5,Math.min(2.5,weighted));
}

export function behaviorAdjustments(state:CamelliaState,actionId:string,date=new Date()) {
  const recent=recentMemories(state,actionId,7,date);
  const proposed=recent.filter(m=>m.event==='proposed').length;
  const executed=recent.filter(m=>m.event==='started'||m.event==='completed').length;
  const lastExecuted=[...recent].reverse().find(m=>m.event==='started'||m.event==='completed');
  const hoursSince=lastExecuted?(date.getTime()-new Date(lastExecuted.createdAt).getTime())/3600000:Infinity;
  const disliked=recent.some(m=>m.event==='dismissed'&&m.dismissReason==='dislike');
  const saved=state.savedActions.filter(s=>s.actionId===actionId);
  const isHoliday=[0,6].includes(date.getDay());
  const saveBoost=saved.reduce((sum,s)=>{
    if(s.timing==='holiday'&&isHoliday)return sum+1.25;
    if(s.timing==='later_today'&&new Date(s.createdAt).toDateString()===date.toDateString())return sum+.75;
    if(s.timing==='when_free')return sum+.35;
    return sum;
  },0);
  return {history:decayedFeedbackScore(state,actionId,date),proposalPenalty:Math.min(proposed*.35,1.4),recentExecutionPenalty:hoursSince<24?1.5:hoursSince<72?.6:0,dislikePenalty:disliked?3:0,saveBoost,proposed,executed};
}
