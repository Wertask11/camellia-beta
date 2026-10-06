import { ACTIONS, CATEGORY_LABELS } from '@/data/actions';
import { behaviorAdjustments } from '@/lib/memory/engine';
import type { CamelliaState, Category, Checkin, Recommendation, TimeBand } from '@/types';

export type CategoryScores = Record<Category, number>;

const blankScores = (): CategoryScores => ({ REST: 0, BODY: 0, BEAUTY: 0, PLAY: 0, LEARN: 0, CONNECT: 0 });
const isGoodCheck = (check?: Checkin) => check?.mood !== undefined && check.mood >= 4
  && (check.sleep === undefined || check.sleep >= 7)
  && (check.stress === undefined || check.stress === '低い')
  && (check.body === undefined || check.body === '良い');

export function getTimeBand(date = new Date()): TimeBand {
  const hour = date.getHours();
  if (hour < 11) return '朝';
  if (hour < 15) return '昼';
  if (hour < 19) return '夕方';
  return '夜';
}

export function latestCheckin(checkins: Checkin[], before = new Date()): Checkin | undefined {
  return [...checkins]
    .filter((item) => new Date(item.createdAt) <= before)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function calculateCategoryScores(state: CamelliaState, date = new Date()): CategoryScores {
  const scores = blankScores();
  const check = latestCheckin(state.checkins, date);
  const profile = state.profile;
  if (check?.sleep !== undefined) {
    if (check.sleep < 6) scores.REST += 3;
    else if (check.sleep < 7) scores.REST += 2;
  }
  if (check?.stress === '高い') { scores.REST += 2; scores.CONNECT += 1; }
  if (check?.stress === 'やや高い') { scores.REST += 1; scores.CONNECT += 1; }
  if (check?.body === '疲れ気味' || check?.body === '悪い') { scores.REST += 2; scores.BODY += 1; }
  if (check?.periodDays !== undefined && check.periodDays <= 3) { scores.REST += 2; scores.BODY += 1; }
  if (check && check.mood <= 2) { scores.REST += 1; scores.CONNECT += 2; }
  const isGoodState = isGoodCheck(check);
  if (isGoodState) { scores.PLAY += 2; scores.LEARN += 1.5; scores.BODY += 1; scores.REST -= 1.5; }

  for (const interest of profile.interests) {
    if (interest.includes('美容')) scores.BEAUTY += 1;
    if (interest.includes('運動') || interest.includes('健康')) scores.BODY += 1;
    if (interest.includes('学')) scores.LEARN += 1;
    if (interest.includes('趣味') || interest.includes('音楽')) scores.PLAY += 1;
    if (interest.includes('メンタル')) scores.REST += 1;
  }
  for(const purpose of profile.purposes||[]){
    if(purpose==='身体を整えたい')scores.BODY+=1;
    if(purpose==='生活を整えたい'){scores.BODY+=0.5;scores.LEARN+=0.5;}
    if(purpose==='心を整えたい'){scores.REST+=0.5;scores.CONNECT+=0.5;}
    if(purpose==='人間関係'||purpose==='恋愛')scores.CONNECT+=1;
    if(purpose==='仕事')scores.LEARN+=1;
  }
  const priorities: Record<string, Category> = { 整える: 'BODY', 楽しむ: 'PLAY', 話す: 'CONNECT', 学ぶ: 'LEARN', 休む: 'REST', 美容: 'BEAUTY' };
  if (priorities[profile.priority]) scores[priorities[profile.priority]] += 1.5;
  const band = getTimeBand(date);
  if (band === '朝') { scores.BODY += 0.5; scores.LEARN += 0.5; }
  if (band === '昼') scores.PLAY += 0.5;
  if (band === '夕方') { scores.CONNECT += 0.5; scores.BODY += 0.5; }
  if (band === '夜') { scores.REST += 1; scores.BEAUTY += 0.5; }
  if (profile.lifestyle.includes('仕事') || profile.lifestyle.includes('忙')) scores.REST += 0.5;
  return scores;
}

function reasonsFor(state: CamelliaState, actionId: string, category: Category, check?: Checkin): string[] {
  const reasons: string[] = [];
  if (check?.sleep !== undefined && check.sleep < 6 && category === 'REST') reasons.push(`入力では睡眠が${check.sleep}時間と短めだったから`);
  if ((check?.stress === '高い' || check?.stress === 'やや高い') && ['REST', 'CONNECT', 'BODY'].includes(category)) reasons.push('入力を見るとストレスを感じているのかもしれないから');
  if ((check?.body === '疲れ気味' || check?.body === '悪い') && ['REST', 'BODY'].includes(category)) reasons.push('入力では身体に疲れを感じているようだから');
  if (check?.periodDays !== undefined && check.periodDays <= 3 && ['REST', 'BODY'].includes(category)) reasons.push(`生理予定まで${check.periodDays}日だから`);
  if (state.profile.interests.some((x) => x.includes('美容')) && category === 'BEAUTY') reasons.push('美容への興味に合っているから');
  const good = state.actionFeedback.filter((x) => x.actionId === actionId && x.rating === 'great').length;
  if (good >= 2) reasons.push(`過去に${good}回「よかった」と感じているから`);
  if (!reasons.length) reasons.push(`${CATEGORY_LABELS[category]}時間が、今のあなたに合いそうだから`);
  return reasons;
}

export function recommend(state: CamelliaState, date = new Date(), category?: Category, limit = 3): Recommendation[] {
  const scores = calculateCategoryScores(state, date);
  const check = latestCheckin(state.checkins, date);
  const isGoodState = isGoodCheck(check);
  const band = getTimeBand(date);
  /* 使える時間に収まるものだけにする。ただし収まるものが少なすぎるときは絞らず、
     長いものを下げるだけにする（1分と答えた人に「何もしない」しか出なくなるため）。 */
  const inCategory = ACTIONS.filter((action) => !category || action.category === category);
  const fits = inCategory.filter(action=>!state.profile.availableMinutes||action.minutes<=state.profile.availableMinutes);
  const pool = fits.filter(action=>action.id!=='do-nothing').length >= limit ? fits : inCategory;
  return pool
    .map((action) => {
      const memory=behaviorAdjustments(state,action.id,date);
      let score = scores[action.category] + memory.history + memory.saveBoost - memory.proposalPenalty - memory.recentExecutionPenalty - memory.dislikePenalty;
      if (action.tags.includes(band === '朝' ? 'morning' : 'night') && (band === '朝' || band === '夜')) score += 0.5;
      if (check?.stress === '高い' && action.tags.includes('stress')) score += 1;
      if (check?.body === '疲れ気味' && action.tags.includes('body')) score += 1;
      if (state.profile.availableMinutes && action.minutes > state.profile.availableMinutes) score -= 2;
      if(check?.body==='悪い'&&action.id==='walk')score-=5;
      if (isGoodState && action.id === 'do-nothing') score -= 1.5;
      return { action, score, reasons: reasonsFor(state, action.id, action.category, check) };
    })
    .sort((a, b) => b.score - a.score || a.action.minutes - b.action.minutes)
    .reduce<Recommendation[]>((picked,item)=>{
      if(picked.length>=limit)return picked;
      const same=picked.filter(x=>x.action.category===item.action.category).length;
      if(!category&&same>=2)return picked;
      picked.push(item);return picked;
    },[]);
}

export function buildTodaySummary(state: CamelliaState, date = new Date()): string {
  const check = latestCheckin(state.checkins, date);
  const name = state.profile.name ? `${state.profile.name}さん、` : '';
  if (!check) return `${name}はじめまして。まず、今日のあなたを少しだけ教えてください。`;
  const parts: string[] = [];
  if (check.mood <= 2) parts.push('入力を見ると、心に少し負担を感じているのかもしれません');
  else if (check.mood >= 4) parts.push('入力を見ると、今日は気持ちに少し余裕があるのかもしれません');
  else parts.push('入力では、今日は比較的穏やかな状態のようです');
  const previous = [...state.checkins].filter((x) => x.id !== check.id && x.sleep !== undefined && Date.parse(x.createdAt)<Date.parse(check.createdAt)).sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (check.sleep !== undefined && previous?.sleep !== undefined) {
    if (check.sleep < previous.sleep) parts.push(`睡眠は前回より${(previous.sleep-check.sleep).toFixed(1)}時間短めです`);
    else if (check.sleep > previous.sleep) parts.push(`睡眠は前回より${(check.sleep-previous.sleep).toFixed(1)}時間とれています`);
  } else if (check.sleep !== undefined) parts.push(`睡眠は${check.sleep}時間でした`);
  if (check.periodDays !== undefined && check.periodDays <= 3) parts.push(`生理予定まで${check.periodDays}日です`);
  if (check.stress === '高い' || check.body === '疲れ気味' || check.body === '悪い') parts.push('もし負担を感じているなら、今日は頑張ることより自分を少し休ませてもよさそうです');
  else if (getTimeBand(date) === '夜') parts.push('今日できたことを認めて、ゆっくり終える時間にしましょう');
  else parts.push('今の調子に合う、小さな一歩から選んでみましょう');
  return `${name}${parts.join('。')}。`;
}
