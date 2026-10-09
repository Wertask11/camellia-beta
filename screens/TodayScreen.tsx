/* oxlint-disable next/no-img-element -- external editorial images are intentionally unoptimized in this prototype */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ACTIONS } from '@/data/actions';
import { getTimeBand } from '@/lib/recommendation';
import { buildDailyReflection } from '@/lib/reflection/engine';
import { checkEntryCopy, yesterdayMood } from '@/lib/reflection/check-entry';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import { checkInputError } from '@/lib/check';
import { generateInsightCandidates, selectDisplayableInsight } from '@/lib/insight/candidates';
import { drawFortune, jstDate } from '@/lib/fortune/engine';
import { ADAPTIVE_STAGE_UI, TODAY_ONE_FLOW } from '@/lib/features';
import {
  BODY_CHIPS, IN_PLACE_STEPS, MOODS, SLEEP_CHIPS, STRESS_CHIPS, actionTitle, checkSummaryLine,
  choseSomethingToday, jstTime, moodMeta, reflectionHeading, splitActiveActions, todayCheck, todayPlans, tomorrowCopy,
} from '@/lib/today/flow';
import { TodayScreenClassic } from '@/screens/TodayScreenClassic';
import type { AnalyticsEventName, CamelliaState, Checkin, FeedbackRating, Mood, Recommendation } from '@/types';

type TodayProps = {
  state: CamelliaState;
  recommendations: Recommendation[];
  forceNight?: boolean;
  onCheckView: () => void;
  onCheckStart: () => void;
  onCheckin: (v: { mood: Mood } & Partial<Omit<Checkin, 'id' | 'mood' | 'createdAt' | 'updatedAt'>>) => void;
  onOpenAction: (r: Recommendation) => void;
  /** 「これにする」: choose this for today (recorded as やってみていること) without leaving Today. */
  onChoose?: (r: Recommendation) => void;
  onIntent: (x: string) => void;
  onTalk: () => void;
  onFortune: () => void;
  onTree: () => void;
  onMy?: () => void;
  onComplete: (id: string) => void;
  onFeedback: (recordId: string, actionId: string, rating: FeedbackRating) => void;
  onProposals: (ids: string[]) => void;
  onTrack: (name: AnalyticsEventName, properties?: Record<string, string | number | boolean>) => void;
  focusIntent?: boolean;
  onIntentFocused?: () => void;
};

/** TODAY_ONE_FLOW off → the Today that was live before β2's one flow, unchanged. */
export function TodayScreen(props: TodayProps) {
  return TODAY_ONE_FLOW ? <TodayOneFlow {...props} /> : <TodayScreenClassic {...props} />;
}

const INTENTS: { label: string; icon: string }[] = [
  { label: '整える', icon: '🌿' },
  { label: '楽しむ', icon: '♫' },
  { label: '学ぶ', icon: '📖' },
  { label: '休む', icon: '☾' },
];
const FEEDBACK: [FeedbackRating, string][] = [
  ['great', '😍 よかった'],
  ['okay', '🙂 まあまあ'],
  ['same', '😐 変わらない'],
  ['bad', '🙅 合わなかった'],
];

/** 「1 / 3 ・ 今日のあなた」 with a text state, so where the person is does not depend on colour. */
function Step({ n, label, state }: { n: number; label: string; state: 'done' | 'now' | 'next' }) {
  return <p className={`flow-step flow-${state}`} aria-current={state === 'now' ? 'step' : undefined}>
    <span>{n} / 3 ・ {label}</span>
    {state === 'done' && <b>✓ 済み</b>}
    {state === 'now' && <b>いまここ</b>}
  </p>;
}

function ChipGroup<T extends string | number>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
}) {
  return <fieldset className="chip-group">
    <legend>{label}</legend>
    <div>
      {options.map(o => {
        const on = value === o.value;
        return <button type="button" key={String(o.value)} aria-pressed={on} className={on ? 'selected' : ''}
          onClick={() => onChange(on ? undefined : o.value)}>
          {on && <span aria-hidden="true">✓ </span>}{o.label}
        </button>;
      })}
    </div>
  </fieldset>;
}

function TodayOneFlow({
  state, forceNight = false, onCheckView, onCheckStart, onCheckin, onOpenAction, onChoose,
  onIntent, onTalk, onFortune, onTree, onMy, onComplete, onFeedback, onProposals, onTrack,
  focusIntent = false, onIntentFocused,
}: TodayProps) {
  const checkViewSent = useRef(false);
  const currentTime = useCurrentTime(state.checkins);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!checkViewSent.current) {
        checkViewSent.current = true;
        onCheckView();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [onCheckView]);
  const [mood, setMood] = useState<Mood | undefined>();
  const [sleep, setSleep] = useState<number | undefined>();
  const [body, setBody] = useState<Checkin['body']>();
  const [stress, setStress] = useState<Checkin['stress']>();
  const [period, setPeriod] = useState('');
  const [editingCheck, setEditingCheck] = useState(false);
  const [inputError, setInputError] = useState('');
  const saveLocked = useRef(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const intentHeading = useRef<HTMLHeadingElement>(null);
  const justSaved = useRef(false);
  useEffect(() => {
    if (!focusIntent) return;
    intentHeading.current?.focus({ preventScroll: true });
    intentHeading.current?.scrollIntoView({ block: 'start' });
    onIntentFocused?.();
  }, [focusIntent, onIntentFocused]);

  const displayDate = useMemo(() => {
    const value = new Date(currentTime.getTime());
    if (forceNight) value.setHours(21, 0, 0, 0);
    return value;
  }, [forceNight, currentTime]);
  const date = useMemo(() => new Intl.DateTimeFormat('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Tokyo',
  }).format(currentTime), [currentTime]);
  const dailyReflection = useMemo(() => buildDailyReflection(state, displayDate), [state, displayDate]);
  const gentleInsight = useMemo(
    () => selectDisplayableInsight(generateInsightCandidates(state, displayDate)),
    [state, displayDate],
  );
  const entryCopy = useMemo(() => checkEntryCopy(state.checkins, displayDate), [state.checkins, displayDate]);
  const yesterday = useMemo(() => yesterdayMood(state.checkins, displayDate), [state.checkins, displayDate]);
  const check = dailyReflection ? todayCheck(state, displayDate) : undefined;
  const checked = Boolean(dailyReflection && check);
  const showForm = !checked || editingCheck;

  useEffect(() => {
    if (checked && justSaved.current && resultHeading.current) {
      justSaved.current = false;
      resultHeading.current.focus({ preventScroll: true });
      resultHeading.current.scrollIntoView({ block: 'start' });
    }
  }, [checked, state.checkins.length]);
  /* 2/3: one plan in front, two quiet ones. 何もしない lives only in 今日どうする？. */
  const plans = useMemo(() => todayPlans(state, displayDate), [state, displayDate]);
  useEffect(() => {
    if (state.checkins.length) onProposals(plans.map(r => r.action.id));
  }, [plans, state.checkins.length, onProposals]);
  const reflectionViewSent = useRef('');
  useEffect(() => {
    if (!dailyReflection) return;
    const key = `${dailyReflection.stage}:${dailyReflection.historyDays}`;
    if (reflectionViewSent.current === key) return;
    reflectionViewSent.current = key;
    onTrack('daily_reflection_view', { reflection_stage: dailyReflection.stage, history_days: dailyReflection.historyDays });
    if (dailyReflection.hasWeeklyInsight) onTrack('weekly_insight_view', { history_days: dailyReflection.historyDays });
  }, [dailyReflection, onTrack]);

  const timeBand = getTimeBand(displayDate);
  const greeting = { 朝: 'おはよう', 昼: 'こんにちは', 夕方: '今日もおつかれさま', 夜: 'こんばんは' }[timeBand];
  const save = () => {
    if (!mood || saveLocked.current) return;
    const error = checkInputError({ mood, sleep, periodDays: period ? Number(period) : undefined });
    setInputError(error);
    if (error) return;
    saveLocked.current = true;
    justSaved.current = true;
    onCheckin({ mood, sleep, body: body || undefined, stress: stress || undefined, periodDays: period ? Number(period) : undefined });
    setEditingCheck(false);
  };
  const recheck = () => {
    saveLocked.current = false;
    setMood(undefined); setSleep(undefined); setBody(undefined); setStress(undefined); setPeriod(''); setInputError('');
    setEditingCheck(true);
  };

  const today = jstDate(displayDate);
  /* Once something is chosen today it stays in front (the engine may reorder after a choice). */
  const mainRecord = state.actions.find(a => jstDate(new Date(a.startedAt ?? a.createdAt)) === today
    && a.status !== 'skipped' && a.actionId !== 'do-nothing' && ACTIONS.some(x => x.id === a.actionId));
  const chosenAction = mainRecord && ACTIONS.find(x => x.id === mainRecord.actionId);
  const main: Recommendation | undefined = chosenAction
    ? plans.find(r => r.action.id === chosenAction.id) ?? { action: chosenAction, score: 0, reasons: ['今日、あなたが選んだ過ごし方'] }
    : plans[0];
  const others = plans.filter(r => r.action.id !== main?.action.id).slice(0, 2);
  const chose = choseSomethingToday(state, displayDate);
  const fortune = state.fortunes.find(f => f.date === today);
  const card = fortune?.status === 'drawn' ? drawFortune(state.profile.id, fortune.date).card : undefined;
  const { today: activeToday, earlier } = splitActiveActions(state.actions, displayDate);
  const awaitingFeedback = state.actions.filter(a =>
    a.status === 'completed' && !state.actionFeedback.some(f => f.actionRecordId === a.id)
    && jstDate(new Date(a.completedAt ?? a.updatedAt)) === today)
    /* The same action done twice today asks once (the latest). */
    .filter((a, i, all) => !all.slice(i + 1).some(b => b.actionId === a.actionId));
  const pickMain = () => {
    if (!main) return;
    if (main.action.opens === 'camellia' || IN_PLACE_STEPS[main.action.id] || !onChoose) onOpenAction(main);
    else onChoose(main);
  };
  const mainLabel = !main ? '' : main.action.opens === 'camellia' ? 'Camelliaに話す' : IN_PLACE_STEPS[main.action.id] ? 'やってみる' : 'これにする';
  const heading = dailyReflection
    ? ADAPTIVE_STAGE_UI ? reflectionHeading(state, dailyReflection.stage, displayDate) : dailyReflection.title
    : '';
  /* 明日のCamellia says what tomorrow brings, so 1/3 does not repeat that sentence. */
  const insightMessages = dailyReflection
    ? dailyReflection.messages.filter(m => !dailyReflection.yesterdayMessages.includes(m))
      .map(m => ADAPTIVE_STAGE_UI ? m.replace(/明日またCheckすると、今日との違いが少し見えてきます。$/, '') : m)
    : [];

  return (
    <main className={`screen today today-flow ${checked ? 'today--checked' : 'today--unchecked'}`}>
      <header>
        <div>
          <p className="date">{date}</p>
          <h1>{state.profile.name ? `${state.profile.name}さん、${greeting}` : greeting}</h1>
        </div>
        <span className="logo-small">Camellia ✿</span>
      </header>

      {checked && check && !editingCheck && (
        <section className="check-folded" aria-label="今日のCheck">
          <span className="check-folded-emoji" aria-hidden="true">{moodMeta(check.mood).emoji}</span>
          <div>
            <p>今日のCheck · {jstTime(check.createdAt)} · {dailyReflection!.historyDays}日目</p>
            <b>{checkSummaryLine(check)}</b>
          </div>
          <button className="text-button" onClick={recheck}>選び直す</button>
        </section>
      )}

      {showForm && (
        <section className="check-card check-primary">
          <p className="eyebrow">今日のCheck · 1分くらい</p>
          <h2>{entryCopy.title}</h2>
          {yesterday && !checked && (
            <p className="yesterday-pill">昨日は「{moodMeta(yesterday).label}」でした。今日は？</p>
          )}
          <p className="check-intro explain">
            {!state.checkins.length && <>まずは、今日のあなたを教えてください。<br /></>}
            {entryCopy.prompt}
          </p>
          <fieldset className="mood-choice">
            <legend className="mood-question">今の気分は？ <span>近いものをひとつ。気分だけでも大丈夫。</span></legend>
            <div className="moods mood-check">
              {MOODS.map(x => (
                <button type="button" aria-label={x.label} aria-pressed={mood === x.value}
                  className={mood === x.value ? 'selected' : ''} key={x.value}
                  onClick={() => { onCheckStart(); saveLocked.current = false; setMood(x.value); }}>
                  {mood === x.value && <span className="mood-tick" aria-hidden="true">✓</span>}
                  <span aria-hidden="true">{x.emoji}</span>
                  <span className="mood-label">{x.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {mood && <>
            <div className="check-details">
              <p className="check-details-title">添えたいものだけ（任意）</p>
              <ChipGroup label="睡眠" options={SLEEP_CHIPS} value={sleep} onChange={setSleep} />
              <ChipGroup label="身体" options={BODY_CHIPS.map(v => ({ value: v, label: v }))} value={body} onChange={setBody} />
              <ChipGroup label="ストレス" options={STRESS_CHIPS.map(v => ({ value: v, label: v }))} value={stress} onChange={setStress} />
              {state.profile.periodEnabled && (
                <label className="period-input">
                  生理予定まで（日）
                  <input type="number" inputMode="numeric" min="0" value={period} onChange={e => setPeriod(e.target.value)} />
                </label>
              )}
            </div>
            {inputError && <p role="alert">{inputError}</p>}
            <button className="primary" onClick={save}>今日の私を見てみる</button>
            <p className="check-note">気分だけでも、このまま見られます</p>
          </>}
          {editingCheck && <button className="text-button" onClick={() => setEditingCheck(false)}>選び直さずに戻る</button>}
          <a className="check-privacy" href="/privacy.html" target="_blank" rel="noopener">記録の取り扱いについて（別タブ）</a>
        </section>
      )}

      {!checked && (
        <section className="flow-preview" aria-label="Checkのあとに返ってくるもの">
          <p>Checkすると、ここに返ってきます</p>
          <ol>
            <li><span>1</span>今日のあなた ・ 昨日との違い</li>
            <li><span>2</span>今日の過ごし方</li>
            <li><span>3</span>今日の一枚</li>
          </ol>
        </section>
      )}

      {checked && dailyReflection && <>
        <section className="flow-card" id="today-result">
          <Step n={1} label="今日のあなた" state="done" />
          <h2 ref={resultHeading} tabIndex={-1}>{heading}</h2>
          {!!dailyReflection.yesterdayMessages.length && (
            <div className="yesterday-difference">
              {heading !== '昨日との違い' && <p className="eyebrow">昨日との違い</p>}
              {dailyReflection.yesterdayMessages.map(m => <p key={m}>{m}</p>)}
            </div>
          )}
          {insightMessages.map(m => <p key={m}>{m}</p>)}
          {gentleInsight && !dailyReflection.messages.includes(gentleInsight.text) && (
            <p className="flow-insight">{gentleInsight.text}<small>{gentleInsight.observations}件の記録から見えた傾向です。</small></p>
          )}
          <span className="meta">Checkとこれまでの記録から。決めつけではありません。</span>
        </section>

        <section className="flow-section" id="today-plans">
          <Step n={2} label="今日の過ごし方" state={chose ? 'done' : 'now'} />
          <p className="gentle-copy explain">今日のCheckを手がかりに、ひとつだけ。選ばなくても大丈夫。</p>
          {main ? <>
            <article className="plan-main">
              <img src={main.action.image} alt="" />
              <div>
                <p className="eyebrow">{main.action.discoverCategory} ・ {main.action.minutes ? `${main.action.minutes}分` : '時間を決めない'}</p>
                <h3>{main.action.title}</h3>
                <p>{main.reasons.join('、')}。</p>
                {mainRecord
                  ? <output className="plan-chosen">✓ {mainRecord.status === 'completed' ? 'できました' : '今日はこれにしました'}</output>
                  : <button className="plan-cta" onClick={pickMain}>{mainLabel}</button>}
              </div>
            </article>
            {!!others.length && (
              <ul className="plan-others">
                {others.map(r => (
                  <li key={r.action.id}>
                    <button onClick={() => onOpenAction(r)} aria-label={`${r.action.title}（${r.action.minutes ? `${r.action.minutes}分` : '時間を決めない'}）を開く`}>
                      <span>{r.action.title}<small> · {r.action.minutes ? `${r.action.minutes}分` : '時間を決めない'}</small></span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </> : <p className="empty">今日は、提案できる過ごし方がまだありません。</p>}
        </section>

        <section className="flow-section">
          <Step n={3} label="今日の一枚" state={fortune ? 'done' : chose ? 'now' : 'next'} />
          <button className="fortune-entry" onClick={onFortune}>
            <span className="fortune-entry-card" aria-hidden="true">✿</span>
            <span>
              {card ? <>
                <b>{card.nameJa}（{fortune!.orientation === 'upright' ? '正位置' : '逆位置'}）</b>
                <span>{card.keywords.join('・')}。もう一度見る →</span>
              </> : fortune?.status === 'skipped' ? <>
                <b>今日は引かない日</b>
                <span>自分で決める日。開いて確かめる →</span>
              </> : <>
                <b>今の自分を、別の角度から</b>
                <span>未来を決めるものではなく、今日を見るための小さなきっかけ。</span>
                <strong>一枚引く →</strong>
              </>}
            </span>
          </button>
        </section>

        <section className="flow-intent">
          <h2 id="today-intent" ref={intentHeading} tabIndex={-1}>今日どうする？</h2>
          <p className="intent-sub">ほかの気分の過ごし方を見る</p>
          <div className="intent-row">
            {INTENTS.map(x => (
              <button key={x.label} onClick={() => onIntent(x.label)} aria-label={`${x.label}過ごし方を見る`}>
                <b aria-hidden="true">{x.icon}</b>{x.label}
              </button>
            ))}
          </div>
          <div className="intent-final">
            <button className="intent-talk" onClick={onTalk}><MessageCircle size={18} aria-hidden="true" />Camelliaに話す</button>
            <button className="intent-nothing" onClick={() => onIntent('何もしない')}>今日は何もしない</button>
          </div>
        </section>

        {(activeToday.length > 0 || earlier.length > 0) && (
          <section className="flow-active">
            <div className="active-head">
              <h2>やってみていること</h2>
              {earlier.length > 0 && (onMy
                ? <button className="text-button" onClick={onMy}>以前の{earlier.length}件はMyに</button>
                : <span>以前の{earlier.length}件はMyに</span>)}
            </div>
            {activeToday.map(a => (
              <div className="active-action" key={a.id}>
                <span>{actionTitle(a)}</span>
                <button className="small-button" onClick={() => onComplete(a.id)}>できた</button>
              </div>
            ))}
            {!activeToday.length && <p className="meta">今日の分はまだありません。</p>}
          </section>
        )}

        {awaitingFeedback.map(a => (
          <section className="reflection" key={a.id}>
            <p className="eyebrow">{timeBand === '夜' ? '夜の振り返り' : 'やってみて'}</p>
            <h2>「{actionTitle(a)}」はどうだった？</h2>
            <div>
              {FEEDBACK.map(([r, l]) => <button key={r} onClick={() => onFeedback(a.id, a.actionId, r)}>{l}</button>)}
            </div>
          </section>
        ))}

        <section className="tomorrow-card">
          <p className="eyebrow">明日のCamellia</p>
          <p>{tomorrowCopy(dailyReflection.stage, dailyReflection.historyDays, ADAPTIVE_STAGE_UI)}</p>
          <button className="text-button" onClick={onTree}>今日、印象に残った人は？ My Treeに一言 →</button>
        </section>
      </>}
    </main>
  );
}
