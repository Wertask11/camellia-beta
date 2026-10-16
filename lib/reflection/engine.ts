import { jstDate } from '@/lib/fortune/engine';
import type { CamelliaState, Checkin, ReflectionStage } from '@/types';

export interface DailyReflection {
  stage: ReflectionStage;
  historyDays: number;
  title: string;
  messages: string[];
  yesterdayMessages: string[];
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
    return `${label}の入力は昨日と同じくらいでした。`;
  if (label === '気持ち')
    return diff > 0
      ? '気分の入力は、昨日より少し上向きでした。'
      : '気分の入力は、昨日より少し低めでした。';
  return diff > 0
    ? `${label}は昨日より少し${unit || '高め'}です。`
    : `${label}は昨日より少し${unit ? '少なめ' : '低め'}です。`;
};

function todayMessage(check: Checkin) {
  return `今日の気分は「${['','つらい','少しつらい','普通','良い','とても良い'][check.mood]}」の記録でした。今の感覚を優先してください。`;
}

export function currentWeekChecks(checks: Checkin[], now: Date) {
  const weekday = new Date(now.getTime() + 9 * 3600000).getUTCDay();
  const monday = jstDayOffset(now, -((weekday + 6) % 7));
  return checks.filter(check => jstDate(new Date(check.createdAt)) >= monday && jstDate(new Date(check.createdAt)) <= jstDate(now));
}

function recentMessages(checks: Checkin[]) {
  const messages: string[] = [];
  const moods = checks.map((x) => x.mood);
  if (Math.max(...moods) - Math.min(...moods) <= 1)
    messages.push(`この${checks.length}回の記録では、気分の入力は1段階以内の範囲でした。`);
  const sleep = checks.flatMap((x) => (x.sleep === undefined ? [] : [x.sleep]));
  if (
    sleep.length >= 2 &&
    sleep.filter((x) => x < 6).length >= Math.ceil(sleep.length * 0.6)
  )
    messages.push(`直近${checks.length}回のうち、睡眠が6時間未満の記録が${sleep.filter(x=>x<6).length}回ありました。`);
  const bodies = checks.flatMap((x) => (x.body ? [bodyScore[x.body]] : []));
  if (
    bodies.length >= 2 &&
    bodies.at(-1)! <
      bodies.slice(0, -1).reduce((a, b) => a + b, 0) / (bodies.length - 1)
  )
    messages.push(
      `この${checks.length}回では、今日は身体の疲れの入力が少し高めでした。`,
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
      '最近は、ストレスと身体の疲れを同時に高めと記録した日がいくつかありました。',
    );
  const secondHalf = checks.slice(Math.floor(checks.length / 2));
  const tiredLate = secondHalf.filter(
    (x) => x.body && bodyScore[x.body] <= 2,
  ).length;
  if (tiredLate >= Math.ceil(secondHalf.length / 2))
    messages.push('直近の後半には、身体の疲れを高めと記録した日がありました。');
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
  const weekly = currentWeekChecks(checks, now);
  const messages = [todayMessage(today)];
  const recentDays = new Set(recent.map(c => jstDate(new Date(c.createdAt))));
  const selected = state.actions?.filter(a => a.status !== 'skipped' && recentDays.has(jstDate(new Date(a.createdAt)))).length ?? 0;
  const yesterdayMessages = yesterday ? [
    compareNumber('気持ち', today.mood, yesterday.mood),
    compareNumber('睡眠', today.sleep, yesterday.sleep, '長め'),
    today.body && yesterday.body ? compareNumber('身体の疲れ', 5 - bodyScore[today.body], 5 - bodyScore[yesterday.body]) : undefined,
    today.stress && yesterday.stress ? compareNumber('ストレス', stressScore[today.stress], stressScore[yesterday.stress]) : undefined,
  ].filter((message): message is string => Boolean(message)).slice(0, 4) : [];
  let stage: ReflectionStage = 'first_day';

  if (!prior.length) {
    messages.push(
      '今日が、最初の一日です。今日の記録が、明日のあなたを知る手がかりになります。明日またCheckすると、今日との違いが少し見えてきます。',
    );
  } else if (weekly.length >= 5) {
    stage = 'weekly';
    messages.push(...weeklyMessages(weekly));
    if (messages.length === 1)
      messages.push(
        `今週は${weekly.length}日分の記録があります。大きな傾向は決めつけず、今日の感覚も大切にしてください。`,
      );
  } else if (recent.length >= 3) {
    stage = 'recent';
    messages.push(...recentMessages(recent));
    if (selected) messages.push(`この3回の記録の日に、過ごし方を${selected}件選んでいます。`);
    if (messages.length === 1 && yesterday)
      messages.push(compareNumber('気持ち', today.mood, yesterday.mood)!);
  } else if (yesterday) {
    stage = 'yesterday_compare';
    messages.push(...yesterdayMessages);
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
        ? '今週のあなた'
        : stage === 'recent'
          ? '最近のあなた'
          : '今日のあなた',
    messages,
    yesterdayMessages,
    hasWeeklyInsight: stage === 'weekly',
  };
}
