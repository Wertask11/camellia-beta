import { calculateCategoryScores, latestCheckin } from '@/lib/recommendation';
import type { CamelliaState, Recommendation } from '@/types';
export function createCamelliaReply(state:CamelliaState,recs:Recommendation[],question:string) {
  const check=latestCheckin(state.checkins); const scores=calculateCategoryScores(state); const strongest=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const completed=state.actions.filter(a=>a.status==='completed').length; const good=state.actionFeedback.filter(f=>f.rating==='great').length;
  if(!check) return 'まだ今日の状態が分からないので、Todayで気分をひとつ教えてください。そこから一緒に考えます。';
  const details=[`今の気分は5段階で${check.mood}`,check.sleep!==undefined?`睡眠は${check.sleep}時間`:null,check.stress?`ストレスは「${check.stress}」`:null,check.body?`身体は「${check.body}」`:null].filter(Boolean).join('、');
  return `${details}ですね。${state.profile.interests.length?`興味のある「${state.profile.interests.join('・')}」も含め、`:''}今は${strongest}の必要度が高めです。${completed?`これまで${completed}件を実行し、${good}件を「よかった」と評価しています。`:''}「${question}」には、まず「${recs[0]?.action.title ?? 'ゆっくり休む'}」が無理のない選択だと思います。`;
}
