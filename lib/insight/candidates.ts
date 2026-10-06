import { jstDate } from '@/lib/fortune/engine';
import { dailyCheckins } from '@/lib/reflection/engine';
import { ACTIONS } from '@/data/actions';
import type { CamelliaState, Checkin } from '@/types';

export type InsightCandidateType =
  | 'yesterday_difference'
  | 'weekly_average'
  | 'mood_trend'
  | 'weekday_pattern'
  | 'action_following_check'
  | 'repeated_choice';

export interface InsightCandidate {
  key: string;
  type: InsightCandidateType;
  confidence: number;
  observations: number;
  summaryData: Record<string, string | number>;
  text: string;
}

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00+09:00`);
const weekdayOf = (date: Date) => {
  const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Tokyo' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(short);
};

function checkDays(state: CamelliaState, now: Date) {
  const notFromFuture = state.checkins.filter((check) => {
    const timestamp = Date.parse(check.createdAt);
    return Number.isFinite(timestamp) && timestamp <= now.getTime();
  });
  return dailyCheckins(notFromFuture, now);
}

function moodLabel(value: number) {
  if (value >= 4.25) return '少し上向き';
  if (value <= 2.25) return '少し低め';
  return '中間';
}

function checkCandidates(checks: Checkin[], now: Date): InsightCandidate[] {
  const today = jstDate(now);
  const ordered = checks.filter((check) => jstDate(new Date(check.createdAt)) <= today);
  const recent = ordered.filter((check) => {
    const distance = (dayNumber(today) - dayNumber(jstDate(new Date(check.createdAt)))) / 86_400_000;
    return distance >= 0 && distance < 7;
  });
  const previous = ordered.filter((check) => {
    const distance = (dayNumber(today) - dayNumber(jstDate(new Date(check.createdAt)))) / 86_400_000;
    return distance >= 7 && distance < 14;
  });
  const candidates: InsightCandidate[] = [];
  const todayCheck = ordered.find((check) => jstDate(new Date(check.createdAt)) === today);
  const yesterday = ordered.find((check) => jstDate(new Date(check.createdAt)) === jstDate(new Date(now.getTime() - 86_400_000)));

  if (todayCheck && yesterday) {
    const difference = todayCheck.mood - yesterday.mood;
    if (Math.abs(difference) >= 2) {
      candidates.push({
        key: `mood-yesterday-${today}`,
        type: 'yesterday_difference',
        confidence: 0.62,
        observations: 2,
        summaryData: { today: todayCheck.mood, yesterday: yesterday.mood, difference },
        text: difference > 0
          ? '昨日と比べると、今日は気分が少し上向いているようです。'
          : '昨日と比べると、今日は気分が少し重めのようです。',
      });
    }
  }

  const lastSeven = recent;
  const previousSeven = previous;
  if (lastSeven.length >= 4) {
    const currentAverage = average(lastSeven.map((check) => check.mood));
    if (previousSeven.length >= 4) {
      const previousAverage = average(previousSeven.map((check) => check.mood));
      const delta = currentAverage - previousAverage;
      if (Math.abs(delta) >= 0.6) {
        candidates.push({
          key: `mood-weekly-${today}`,
          type: 'weekly_average',
          confidence: Math.min(0.82, 0.58 + Math.min(lastSeven.length, previousSeven.length) * 0.02),
          observations: lastSeven.length + previousSeven.length,
          summaryData: { recentAverage: Number(currentAverage.toFixed(2)), previousAverage: Number(previousAverage.toFixed(2)), delta: Number(delta.toFixed(2)) },
          text: delta > 0
            ? '先週の記録と比べると、最近は気分が少し上向いているようです。'
            : '先週の記録と比べると、最近は気分が少し低めの日が増えているようです。',
        });
      }
    }

    const firstHalf = lastSeven.slice(0, Math.floor(lastSeven.length / 2));
    const secondHalf = lastSeven.slice(Math.floor(lastSeven.length / 2));
    const trend = average(secondHalf.map((check) => check.mood)) - average(firstHalf.map((check) => check.mood));
    if (Math.abs(trend) >= 0.8) {
      candidates.push({
        key: `mood-trend-${today}`,
        type: 'mood_trend',
        confidence: 0.6,
        observations: lastSeven.length,
        summaryData: { earlierAverage: Number(average(firstHalf.map((check) => check.mood)).toFixed(2)), recentAverage: Number(average(secondHalf.map((check) => check.mood)).toFixed(2)), delta: Number(trend.toFixed(2)) },
        text: trend > 0
          ? '直近の記録では、前半より後半のほうが気分が少し上向いているようです。'
          : '直近の記録では、前半より後半のほうが気分が少し低めの日がありました。',
      });
    }
  }

  const byWeekday = new Map<number, number[]>();
  for (const check of ordered) {
    const day = weekdayOf(new Date(check.createdAt));
    byWeekday.set(day, [...(byWeekday.get(day) || []), check.mood]);
  }
  for (const [weekday, values] of byWeekday) {
    const others = ordered.filter((check) => weekdayOf(new Date(check.createdAt)) !== weekday).map((check) => check.mood);
    if (values.length < 3 || others.length < 3) continue;
    const delta = average(values) - average(others);
    if (Math.abs(delta) < 0.8) continue;
    const weekdayName = ['日', '月', '火', '水', '木', '金', '土'][weekday];
    candidates.push({
      key: `weekday-${weekday}-${today}`,
      type: 'weekday_pattern',
      confidence: Math.min(0.74, 0.56 + values.length * 0.04),
      observations: values.length + others.length,
      summaryData: { weekday, weekdayAverage: Number(average(values).toFixed(2)), otherDaysAverage: Number(average(others).toFixed(2)), delta: Number(delta.toFixed(2)) },
      text: `${weekdayName}曜日の記録では、ほかの日と比べて気分が${moodLabel(average(values))}ことが多いようです。`,
    });
  }
  return candidates;
}

function choiceCandidates(state: CamelliaState, now: Date): InsightCandidate[] {
  const today = jstDate(now);
  const checks = new Map(checkDays(state, now).map((check) => [jstDate(new Date(check.createdAt)), check]));
  const memories = state.contextualMemory.filter((memory) => {
    const timestamp = Date.parse(memory.createdAt);
    return Number.isFinite(timestamp) && timestamp <= now.getTime() && jstDate(new Date(timestamp)) <= today;
  });
  const actionDays = new Map<string, Map<string, { mood: number; startedAt: number }>>();
  for (const memory of memories) {
    if (memory.event !== 'started' || memory.context.mood === undefined) continue;
    const date = jstDate(new Date(memory.createdAt));
    const byDay = actionDays.get(memory.actionId) || new Map<string, { mood: number; startedAt: number }>();
    const startedAt = Date.parse(memory.createdAt);
    const previous = byDay.get(date);
    if (!previous || startedAt > previous.startedAt) byDay.set(date, { mood: memory.context.mood, startedAt });
    actionDays.set(memory.actionId, byDay);
  }
  const actionAssociations = [...actionDays.entries()].flatMap(([actionId, beforeByDay]) => {
    const pairs = [...beforeByDay.entries()].flatMap(([date, before]) => {
      const hadCheckBeforeAction = state.checkins.some((check) =>
        jstDate(new Date(check.createdAt)) === date && Date.parse(check.createdAt) <= before.startedAt,
      );
      const nextDate = jstDate(new Date(dayNumber(date) + 86_400_000));
      const next = checks.get(nextDate);
      return hadCheckBeforeAction && next && Date.parse(next.createdAt) > before.startedAt
        ? [{ date, difference: next.mood - before.mood }]
        : [];
    });
    if (pairs.length < 4 || new Set(pairs.map((pair) => pair.date)).size < 3) return [];
    const improved = pairs.filter((pair) => pair.difference > 0).length;
    const declined = pairs.filter((pair) => pair.difference < 0).length;
    const direction = improved >= 3 ? 'up' : declined >= 3 ? 'down' : '';
    if (!direction) return [];
    const title = ACTIONS.find((action) => action.id === actionId)?.title || 'この行動';
    return [{
      key: `action-following-check-${actionId}-${today}`,
      type: 'action_following_check' as const,
      confidence: Math.min(0.72, 0.57 + pairs.length * 0.025),
      observations: pairs.length,
      summaryData: { actionId, pairedDays: pairs.length, improved, declined, averageDifference: Number(average(pairs.map((pair) => pair.difference)).toFixed(2)) },
      text: direction === 'up'
        ? `「${title}」を始めた日の翌日に記録したCheckでは、開始前より気分が上向いていた回が複数ありました。記録上の並びとしての気づきです。`
        : `「${title}」を始めた日の翌日に記録したCheckでは、開始前より気分が低めだった回が複数ありました。記録上の並びとしての気づきです。`,
    }];
  });
  const grouped = new Map<string, { selected: number; dates: Set<string> }>();
  for (const memory of memories) {
    if (memory.event !== 'started') continue;
    const value=grouped.get(memory.actionId)||{selected:0,dates:new Set<string>()};
    value.selected++;value.dates.add(jstDate(new Date(memory.createdAt)));
    grouped.set(memory.actionId,value);
  }
  const repeatedChoices=[...grouped.entries()]
    .filter(([,value])=>value.selected>=4&&value.dates.size>=3)
    .map(([actionId,value])=>({
      key:`repeated-choice-${actionId}-${today}`,
      type:'repeated_choice' as const,
      confidence:Math.min(0.76,0.56+value.dates.size*0.035),
      observations:value.selected,
      summaryData:{actionId,distinctDays:value.dates.size,selections:value.selected},
      text:`「${ACTIONS.find(action=>action.id===actionId)?.title||'同じ行動'}」を選んだ記録が、${value.dates.size}日で${value.selected}回あります。最近のあなたにとって、取り入れやすい選択なのかもしれません。`,
    }));
  return [...actionAssociations, ...repeatedChoices];
}

export function generateInsightCandidates(
  state: CamelliaState,
  now = new Date(),
): InsightCandidate[] {
  return [...checkCandidates(checkDays(state, now), now), ...choiceCandidates(state, now)]
    .filter((candidate) => candidate.observations >= (candidate.type === 'yesterday_difference' ? 2 : 4))
    .sort((a, b) => b.confidence - a.confidence || b.observations - a.observations)
    .slice(0, 5);
}

export function selectDisplayableInsight(candidates: InsightCandidate[]) {
  return candidates.find((candidate) => candidate.observations >= 4 && candidate.confidence >= 0.6);
}
