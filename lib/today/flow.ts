/* Pure helpers for Today's one flow (Check → 今日のあなた → 今日の過ごし方 → 今日の一枚 → 今日どうする？ → 明日のCamellia).
   Everything here reads the person's own records. Nothing guesses from age, and nothing invents a
   yesterday, a recent trend or a week that is not in the records. */
import { ACTIONS } from '@/data/actions';
import { recommend } from '@/lib/recommendation/engine';
import { jstDate } from '@/lib/fortune/engine';
import { dailyCheckins, jstDayOffset } from '@/lib/reflection/engine';
import type { ActionRecord, CamelliaState, Checkin, Mood, ReflectionStage } from '@/types';

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 5, emoji: '😊', label: 'とても良い' },
  { value: 4, emoji: '🙂', label: '良い' },
  { value: 3, emoji: '😐', label: '普通' },
  { value: 2, emoji: '😔', label: '少しつらい' },
  { value: 1, emoji: '😣', label: 'つらい' },
];
export const moodMeta = (mood: Mood) => MOODS.find(m => m.value === mood) ?? MOODS[2];

/* Sleep chips save the same number the old field did (5 / 6 / 7 / 8), so the Checkin type and the
   yesterday comparison (a difference of 0.75 h or more) keep working. */
export const SLEEP_CHIPS: { value: number; label: string }[] = [
  { value: 5, label: '5h以下' },
  { value: 6, label: '6h' },
  { value: 7, label: '7h' },
  { value: 8, label: '8h以上' },
];
export const BODY_CHIPS: NonNullable<Checkin['body']>[] = ['良い', '普通', '疲れ気味', '悪い'];
export const STRESS_CHIPS: NonNullable<Checkin['stress']>[] = ['低い', '普通', 'やや高い', '高い'];

const sleepText = (hours: number) => (hours <= 5 ? '5h以下' : hours >= 8 ? '8h以上' : `${hours}h`);

/** One line under the folded Check: 「良い · 睡眠 7h · 身体 普通 · ストレス 低い」 (only what was given). */
export function checkSummaryLine(check: Checkin) {
  return [
    moodMeta(check.mood).label,
    check.sleep !== undefined ? `睡眠 ${sleepText(check.sleep)}` : '',
    check.body ? `身体 ${check.body}` : '',
    check.stress ? `ストレス ${check.stress}` : '',
  ].filter(Boolean).join(' · ');
}

export function todayCheck(state: CamelliaState, now: Date) {
  return dailyCheckins(state.checkins, now).find(c => jstDate(new Date(c.createdAt)) === jstDate(now));
}

export const jstTime = (iso: string) =>
  new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' }).format(new Date(iso));

/** The heading of 1/3 grows with the person's own records (never with age):
 * 今日のあなた → 昨日との違い → 最近のあなた → 今週のあなた.
 * 「今週のあなた」 only when the last seven daily Checks really fall within seven days. */
export function reflectionHeading(state: CamelliaState, stage: ReflectionStage, now: Date) {
  if (stage === 'yesterday_compare') return '昨日との違い';
  if (stage === 'recent') return '最近のあなた';
  if (stage !== 'weekly') return '今日のあなた';
  const last7 = dailyCheckins(state.checkins, now).slice(-7);
  const first = last7[0] ? jstDate(new Date(last7[0].createdAt)) : '';
  return first && first >= jstDayOffset(now, -6) ? '今週のあなた' : '最近7回のあなた';
}

/** 明日のCamellia: what tomorrow's Check can really bring back, from the same thresholds the reflection engine uses
 * (yesterday_compare: a Check yesterday; recent: 3 daily Checks; weekly: 7). Not a reward and not a promise. */
export function tomorrowCopy(stage: ReflectionStage, historyDays: number, adaptive = true) {
  if (!adaptive) return '明日もCheckすると、今日との違いが見えてきます。';
  const next = historyDays + 1;
  if (stage === 'weekly') return '明日Checkすると、今日との違いと、直近7回の流れが見えてきます。';
  if (next >= 7) return `明日でCheckが${next}回に。直近7回の流れから、あなたのパターンが見えてきます。`;
  if (next >= 3 && historyDays < 3) return `明日でCheckが${next}回に。最近のあなたの流れが見えてきます。`;
  if (next >= 3) return `明日Checkすると、今日との違いと最近の流れが見えてきます。7回分のふり返りまで、あと${7 - historyDays}回です。`;
  return '明日またCheckすると、今日との違いが見えてきます。';
}

/** The title to show for an action record. Older records saved 「AI Camelliaに話す」; the stored title is left as it
 * is and only the display uses the current name. */
export function actionTitle(record: Pick<ActionRecord, 'actionId' | 'title'>) {
  return ACTIONS.find(a => a.id === record.actionId)?.title ?? record.title.replace(/AI Camellia/g, 'Camellia');
}

const recordDay = (record: ActionRecord) => jstDate(new Date(record.startedAt ?? record.createdAt));
/** やってみていること: Today shows only today's; the earlier ones are counted and kept in My (never deleted). */
export function splitActiveActions(actions: ActionRecord[], now: Date) {
  const today = jstDate(now);
  const active = actions.filter(a => a.status === 'started');
  return { today: active.filter(a => recordDay(a) === today), earlier: active.filter(a => recordDay(a) !== today) };
}

/** 2/3 is done once something was chosen today (started, done, saved for later or 今日は何もしない). */
export function choseSomethingToday(state: CamelliaState, now: Date) {
  const today = jstDate(now);
  return state.actions.some(a => recordDay(a) === today && a.status !== 'skipped')
    || state.savedActions.some(s => jstDate(new Date(s.createdAt)) === today);
}

/** Actions that can be done right here, with a minimal guided step. Everything else is chosen for later today. */
export const IN_PLACE_STEPS: Record<string, string[]> = {
  breathing: ['目を閉じるか、視線を少し下に。', '4つ数えて吸って、6つ数えて吐く。', 'それを4回だけ。数えなくても大丈夫。'],
};

/** Today's three plans (2/3): the existing engine's order, without 何もしない (that choice lives only in
 * 今日どうする？). Discover leaves these same three out. */
export function todayPlans(state: CamelliaState, now: Date) {
  return recommend(state, now, undefined, 4).filter(r => r.action.id !== 'do-nothing').slice(0, 3);
}
