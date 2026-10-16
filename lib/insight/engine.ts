import { ACTIONS } from '@/data/actions';
import {
  generateInsightCandidates,
  type InsightCandidate,
} from '@/lib/insight/candidates';
import { jstDate } from '@/lib/fortune/engine';
import { dailyCheckins } from '@/lib/reflection/engine';
import type { CamelliaState, Insight } from '@/types';
const family = (key: string) => key.replace(/-\d{4}-\d{2}-\d{2}$/, '');
export function generateInsights(
  state: CamelliaState,
  now = new Date(),
): Insight[] {
  const verdicts = new Map<string, string>();
  for (const feedback of [...state.insightFeedback].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  ))
    verdicts.set(family(feedback.insightKey), feedback.verdict);
  const rejected = (key: string) => verdicts.get(family(key)) === 'incorrect';
  const checks = dailyCheckins(state.checkins, now);
  const age = (date: string) =>
    (Date.parse(jstDate(now)) - Date.parse(jstDate(new Date(date)))) / 86400000;
  const recent = checks.filter((check) => age(check.createdAt) < 14);
  const span = (dates: string[]) => {
    const days = dates
      .filter(
        (date) => Number.isFinite(Date.parse(date)) && Date.parse(date) <= +now,
      )
      .map((date) => jstDate(new Date(date)))
      .sort();
    return { periodStart: days[0], periodEnd: days.at(-1) };
  };
  const make = (
    key: string,
    fact: string,
    hypothesis: string,
    sampleSize: number,
    confidence: number,
    dates: string[],
  ): Insight => ({
    id: key,
    key,
    text: `${fact}${hypothesis}`,
    fact,
    hypothesis,
    sampleSize,
    confidence,
    ...span(dates),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  const factFor = (candidate: InsightCandidate) => {
    const d = candidate.summaryData;
    switch (candidate.type) {
      case 'weekly_average':
        return `直近7日間の気分入力の平均は${d.recentAverage}、その前の7日間は${d.previousAverage}でした（5段階）。`;
      case 'mood_trend':
        return `直近7日間の記録を前半・後半に分けると、気分入力の平均は${d.earlierAverage}から${d.recentAverage}でした（5段階）。`;
      case 'weekday_pattern':
        return `${['日', '月', '火', '水', '木', '金', '土'][Number(d.weekday)]}曜日の気分入力平均は${d.weekdayAverage}、それ以外の日は${d.otherDaysAverage}でした（5段階）。`;
      case 'action_following_check':
        return `「${ACTIONS.find((a) => a.id === d.actionId)?.title ?? 'この行動'}」開始前と翌日Checkを比べた${d.pairedDays}組のうち、上向きが${d.improved}組、低めが${d.declined}組でした。`;
      case 'repeated_choice':
        return `「${ACTIONS.find((a) => a.id === d.actionId)?.title ?? '同じ行動'}」を${d.distinctDays}日で${d.selections}回選びました。`;
      default:
        return '入力した記録の違いです。';
    }
  };
  const out = generateInsightCandidates(state, now)
    .filter((c) => c.observations >= 4 && !rejected(c.key))
    .map((c) =>
      make(
        c.key,
        factFor(c),
        c.type === 'action_following_check'
          ? '記録上の並びで、行動の効果や原因は判断できません。'
          : c.type === 'repeated_choice'
            ? '今の自分に取り入れやすい選択なのかもしれません。違うと感じたら教えてください。'
            : '入力に少し違いがあるようです。生活や体調の原因は決めず、今の実感と照らしてみてください。',
        c.observations,
        c.confidence,
        typeof c.summaryData.periodStart === 'string' &&
          typeof c.summaryData.periodEnd === 'string'
          ? [c.summaryData.periodStart, c.summaryData.periodEnd]
          : (c.type === 'weekday_pattern'
              ? checks
              : c.type === 'mood_trend'
                ? recent.filter((check) => age(check.createdAt) < 7)
                : recent
            ).map((check) => check.createdAt),
      ),
    );
  const sleep = recent.filter(
    (check) => check.sleep !== undefined && age(check.createdAt) < 7,
  );
  if (sleep.length >= 4 && !rejected('sleep-records')) {
    const short = sleep.filter((c) => c.sleep! < 6).length;
    out.push(
      make(
        'sleep-records',
        `直近7日間の睡眠入力${sleep.length}日のうち、6時間未満の記録は${short}日でした。`,
        'この記録だけでは理由や体調は分かりません。今は解釈を決めず、振り返る手がかりにできます。',
        sleep.length,
        0.61,
        sleep.map((c) => c.createdAt),
      ),
    );
  }
  for (const action of ACTIONS) {
    const saved = state.contextualMemory.filter(
      (m) =>
        m.actionId === action.id &&
        m.event === 'saved' &&
        Number.isFinite(Date.parse(m.createdAt)) &&
        Date.parse(m.createdAt) <= +now,
    );
    const days = new Set(saved.map((m) => jstDate(new Date(m.createdAt))));
    const started = state.contextualMemory.some(
      (m) =>
        m.actionId === action.id &&
        (m.event === 'started' || m.event === 'completed') &&
        Date.parse(m.createdAt) <= +now,
    );
    const key = `saved-not-done-${action.id}`;
    if (days.size >= 4 && !started && !rejected(key))
      out.push(
        make(
          key,
          `「${action.title}」を${days.size}日で保存し、開始の記録はまだありません。`,
          '気になっている選択なのかもしれません。始めるかどうかは、今の自分で選べます。',
          days.size,
          0.56,
          saved.map((m) => m.createdAt),
        ),
      );
  }
  return out
    .sort((a, b) => b.confidence - a.confidence || b.sampleSize - a.sampleSize)
    .slice(0, 4);
}
