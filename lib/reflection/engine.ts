import { jstDate } from '@/lib/fortune/engine';
import type { CamelliaState, Checkin, ReflectionStage } from '@/types';

export interface DailyReflection {
  stage: ReflectionStage;
  historyDays: number;
  title: string;
  messages: string[];
  hasWeeklyInsight: boolean;
}

const DAY = 86_400_000;
const bodyScore: Record<NonNullable<Checkin['body']>, number> = {
  良い: 4,
  普通: 3,
  疲れ気味: 2,
  悪い: 1,
};
const stressScore: Record<NonNullable<Checkin['stress']>, number> = {
  低い: 1,
  普通: 2,
  やや高い: 3,
  高い: 4,
};

export const jstDayOffset = (date: Date, offset: number) =>
  jstDate(new Date(date.getTime() + offset * DAY));

/** One source record per JST day. A later check replaces an earlier check for comparison only. */
export function dailyCheckins(
  checkins: Checkin[],
  through = new Date(),
): Checkin[] {
  const throughDay = jstDate(through);
  const byDay = new Map<string, Checkin>();
  for (const check of [...checkins].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )) {
    if(!Number.isFinite(Date.parse(check.createdAt))||Date.parse(check.createdAt)>through.getTime())continue;
    const day = jstDate(new Date(check.createdAt));
    if (day <= throughDay) byDay.set(day, check);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, check]) => check);
}

const compareNumber = (
  label: string,
  current: number | undefined,
  previous: number | undefined,
  unit = '',
) => {
  if (current === undefined || previous === undefined) return undefined;
  const diff = current - previous;
  if (Math.abs(diff) < (label === '睡眠' ? 0.75 : 1))
    return `${label}は昨日とあまり変わっていません。`;
  if (label === '気持ち')
    return diff > 0
      ? '昨日より、気持ちは少し軽そうです。'
      : '昨日より、気持ちは少し重めのようです。';
  return diff > 0
    ? `${label}は昨日より少し${unit || '高め'}です。`
    : `${label}は昨日より少し${unit ? '少なめ' : '低め'}です。`;
};

function todayMessage(check: Checkin) {
  if (check.mood >= 4) return '今日は、気持ちに少し余裕がありそうです。';
  if (check.mood <= 2)
    return '今日は、気持ちに少し負担があるのかもしれません。';
  if (check.body === '疲れ気味' || check.body === '悪い')
    return '今日は、身体の疲れを感じているようです。';
  return '今日は、比較的穏やかな状態のようです。';
}

function recentMessages(checks: Checkin[]) {
  const messages: string[] = [];
  const moods = checks.map((x) => x.mood);
  if (Math.max(...moods) - Math.min(...moods) <= 1)
    messages.push('ここ数日は、気持ちが比較的安定しています。');
  const sleep = checks.flatMap((x) => (x.sleep === undefined ? [] : [x.sleep]));
  if (
    sleep.length >= 2 &&
    sleep.filter((x) => x < 6).length >= Math.ceil(sleep.length * 0.6)
  )
    messages.push('最近は、睡眠が少なめの日が続いています。');
  const bodies = checks.flatMap((x) => (x.body ? [bodyScore[x.body]] : []));
  if (
    bodies.length >= 2 &&
    bodies.at(-1)! <
      bodies.slice(0, -1).reduce((a, b) => a + b, 0) / (bodies.length - 1)
  )
    messages.push(
      `この${checks.length}回では、今日は身体の疲れが少し高めです。`,
    );
  return messages;
}

function weeklyMessages(checks: Checkin[]) {
  const messages: string[] = [];
  const tiredAndStressed = checks.filter(
    (x) =>
      x.body &&
      x.stress &&
      bodyScore[x.body] <= 2 &&
      stressScore[x.stress] >= 3,
  ).length;
  if (tiredAndStressed >= 2)
    messages.push(
      '最近は、ストレスと身体の疲れが同時に高い日がいくつかありました。',
    );
  const secondHalf = checks.slice(Math.floor(checks.length / 2));
  const tiredLate = secondHalf.filter(
    (x) => x.body && bodyScore[x.body] <= 2,
  ).length;
  if (tiredLate >= Math.ceil(secondHalf.length / 2))
    messages.push('直近の後半には、身体の疲れが高めの日がありました。');
  let comparable = 0,
    lowSleepLowMood = 0;
  for (let i = 1; i < checks.length; i++) {
    if (checks[i - 1].sleep === undefined) continue;
    comparable++;
    if (checks[i - 1].sleep! < 6 && checks[i].mood <= 2) lowSleepLowMood++;
  }
  if (comparable >= 3 && lowSleepLowMood >= 2)
    messages.push('睡眠が少なかった次の記録で、気分が低めの日がありました。');
  return messages;
}

export function buildDailyReflection(
  state: CamelliaState,
  now = new Date(),
): DailyReflection | undefined {
  const checks = dailyCheckins(state.checkins, now);
  const today = checks.find(
    (x) => jstDate(new Date(x.createdAt)) === jstDate(now),
  );
  if (!today) return undefined;
  const prior = checks.filter((x) => x.id !== today.id);
  const yesterday = checks.find(
    (x) => jstDate(new Date(x.createdAt)) === jstDayOffset(now, -1),
  );
  const recent = checks.slice(-3);
  const weekly = checks.slice(-7);
  const messages = [todayMessage(today)];
  let stage: ReflectionStage = 'first_day';

  if (!prior.length) {
    messages.push(
      '今日が、最初の一日です。明日またCheckすると、今日との違いが少し見えてきます。',
    );
  } else if (weekly.length >= 7) {
    stage = 'weekly';
    messages.push(...weeklyMessages(weekly));
    if (messages.length === 1)
      messages.push(
        '直近7回の記録では、ひとつに決めつけられるほどの大きな偏りはまだ見えていません。',
      );
  } else if (recent.length >= 3) {
    stage = 'recent';
    messages.push(...recentMessages(recent));
    if (messages.length === 1 && yesterday)
      messages.push(compareNumber('気持ち', today.mood, yesterday.mood)!);
  } else if (yesterday) {
    stage = 'yesterday_compare';
    const comparisons = [
      compareNumber('気持ち', today.mood, yesterday.mood),
      compareNumber('睡眠', today.sleep, yesterday.sleep, '長め'),
      today.body && yesterday.body
        ? compareNumber(
            '身体の疲れ',
            5 - bodyScore[today.body],
            5 - bodyScore[yesterday.body],
          )
        : undefined,
      today.stress && yesterday.stress
        ? compareNumber(
            'ストレス',
            stressScore[today.stress],
            stressScore[yesterday.stress],
          )
        : undefined,
    ].filter((x): x is string => Boolean(x));
    messages.push(...comparisons.slice(0, 2));
  } else {
    messages.push(
      '前の記録はありますが、昨日のCheckはないため、昨日との比較はしていません。',
    );
  }
  return {
    stage,
    historyDays: checks.length,
    title:
      stage === 'weekly'
        ? '最近のあなたのパターン'
        : stage === 'recent'
          ? '最近のあなた'
          : '今日のあなた',
    messages,
    hasWeeklyInsight: stage === 'weekly',
  };
}
