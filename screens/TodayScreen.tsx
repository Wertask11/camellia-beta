import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';
import { ActionCard } from '@/components/ActionCard';
import { buildTodaySummary, getTimeBand } from '@/lib/recommendation';
import { buildDailyReflection } from '@/lib/reflection/engine';
import { checkEntryCopy } from '@/lib/reflection/check-entry';
import { generateInsightCandidates, selectDisplayableInsight } from '@/lib/insight/candidates';
import type {
  AnalyticsEventName,
  CamelliaState,
  Checkin,
  FeedbackRating,
  Mood,
  Recommendation,
} from '@/types';

const moods: { value: Mood; emoji: string; label: string }[] = [
  { value: 5, emoji: '😊', label: 'とても良い' },
  { value: 4, emoji: '🙂', label: '良い' },
  { value: 3, emoji: '😐', label: '普通' },
  { value: 2, emoji: '😔', label: '少しつらい' },
  { value: 1, emoji: '😣', label: 'つらい' },
];
export function TodayScreen({
  state,
  recommendations,
  forceNight = false,
  onCheckView,
  onCheckStart,
  onCheckin,
  onOpenAction,
  onIntent,
  onTalk,
  onFortune,
  onTree,
  onComplete,
  onFeedback,
  onProposals,
  onTrack,
}: {
  state: CamelliaState;
  recommendations: Recommendation[];
  forceNight?: boolean;
  onCheckView: () => void;
  onCheckStart: () => void;
  onCheckin: (
    v: { mood: Mood } & Partial<
      Omit<Checkin, 'id' | 'mood' | 'createdAt' | 'updatedAt'>
    >,
  ) => void;
  onOpenAction: (r: Recommendation) => void;
  onIntent: (x: string) => void;
  onTalk: () => void;
  onFortune: () => void;
  onTree: () => void;
  onComplete: (id: string) => void;
  onFeedback: (
    recordId: string,
    actionId: string,
    rating: FeedbackRating,
  ) => void;
  onProposals: (ids: string[]) => void;
  onTrack: (
    name: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>,
  ) => void;
}) {
  const checkViewSent = useRef(false);
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
  const [more, setMore] = useState(false);
  const [sleep, setSleep] = useState('');
  const [body, setBody] = useState<Checkin['body']>();
  const [stress, setStress] = useState<Checkin['stress']>();
  const [period, setPeriod] = useState('');
  const [saved, setSaved] = useState(false);
  const saveLocked = useRef(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (saved) {
      resultHeading.current?.focus({ preventScroll: true });
      resultHeading.current?.scrollIntoView({ block: 'start' });
    }
  }, [saved]);
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat('ja-JP', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(new Date()),
    [],
  );
  const active = state.actions.filter((a) => a.status === 'started');
  const reflection = state.actions.filter(
    (a) =>
      a.status === 'completed' &&
      !state.actionFeedback.some((f) => f.actionRecordId === a.id),
  );
  useEffect(() => {
    if (state.checkins.length)
      onProposals(recommendations.map((r) => r.action.id));
  }, [recommendations, state.checkins.length, onProposals]);
  const displayDate = useMemo(() => {
    const value = new Date();
    if (forceNight) value.setHours(21, 0, 0, 0);
    return value;
  }, [forceNight]);
  const dailyReflection = useMemo(
    () => buildDailyReflection(state, displayDate),
    [state, displayDate],
  );
  const gentleInsight = useMemo(
    () => selectDisplayableInsight(generateInsightCandidates(state, displayDate)),
    [state, displayDate],
  );
  const entryCopy = useMemo(
    () => checkEntryCopy(state.checkins, displayDate),
    [state.checkins, displayDate],
  );
  const reflectionViewSent = useRef('');
  useEffect(() => {
    if (!dailyReflection) return;
    const key = `${dailyReflection.stage}:${dailyReflection.historyDays}`;
    if (reflectionViewSent.current === key) return;
    reflectionViewSent.current = key;
    onTrack('daily_reflection_view', {
      reflection_stage: dailyReflection.stage,
      history_days: dailyReflection.historyDays,
    });
    if (dailyReflection.hasWeeklyInsight)
      onTrack('weekly_insight_view', {
        history_days: dailyReflection.historyDays,
      });
  }, [dailyReflection, onTrack]);
  const timeBand = getTimeBand(displayDate);
  const greeting = {
    朝: 'おはよう',
    昼: 'こんにちは',
    夕方: '今日もおつかれさま',
    夜: 'こんばんは',
  }[timeBand];
  const save = () => {
    if (!mood || saveLocked.current) return;
    saveLocked.current = true;
    onCheckin({
      mood,
      sleep: sleep ? Number(sleep) : undefined,
      body: body || undefined,
      stress: stress || undefined,
      periodDays: period ? Number(period) : undefined,
    });
    setSaved(true);
    setMore(false);
  };
  return (
    <main className="screen today">
      <header>
        <div>
          <p className="date">{date}</p>
          <h1>
            {state.profile.name
              ? `${state.profile.name}さん、${greeting}`
              : `${greeting}`}
          </h1>
        </div>
        <span className="logo-small">Camellia ✿</span>
      </header>
      <section className="check-card">
        <p className="eyebrow">今日のCheck</p>
        <h2>{entryCopy.title}</h2>
        <p className="check-intro">{entryCopy.prompt}</p>
        <fieldset className="mood-choice">
        <legend className="mood-question">今の気分は？ <span>近いものをひとつ</span></legend>
        <div className="moods">
          {moods.map((x) => (
            <button
              aria-label={x.label}
              aria-pressed={mood === x.value}
              className={mood === x.value ? 'selected' : ''}
              key={x.value}
              onClick={() => {
                onCheckStart();
                saveLocked.current = false;
                setMood(x.value);
                setSaved(false);
              }}
            >
              <span aria-hidden="true">{x.emoji}</span>
              <span className="mood-label">{x.label}</span>
            </button>
          ))}
        </div>
        </fieldset>
        <p className="check-preview">
          Checkのあとに <span>今日のあなた</span>・<span>今日の過ごし方</span>・<span>今日の一枚</span>
        </p>
        {!mood && <p className="check-intro">気分だけでも大丈夫。</p>}
        {mood && <>
        <button className="text-button" onClick={() => setMore(!more)}>
          {more ? '閉じる' : '睡眠や身体のことも添える（任意）'}
        </button>
        {more && (
          <div className="more-check">
            <label>
              睡眠（時間）
              <input
                type="number"
                min="0"
                max="14"
                step="0.5"
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
                placeholder="例 6.5"
              />
            </label>
            <label>
              身体
              <select
                value={body ?? ''}
                onChange={(e) => setBody(e.target.value as Checkin['body'])}
              >
                <option value="">選択しない</option>
                <option>良い</option>
                <option>普通</option>
                <option>疲れ気味</option>
                <option>悪い</option>
              </select>
            </label>
            <label>
              ストレス
              <select
                value={stress ?? ''}
                onChange={(e) => setStress(e.target.value as Checkin['stress'])}
              >
                <option value="">選択しない</option>
                <option>低い</option>
                <option>普通</option>
                <option>やや高い</option>
                <option>高い</option>
              </select>
            </label>
            {state.profile.periodEnabled && (
              <label>
                生理予定まで（日）
                <input
                  type="number"
                  min="0"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </label>
            )}
          </div>
        )}
        <button className="primary" disabled={saved} onClick={save}>
          {saved ? '保存しました' : '今日の私を見てみる'}
        </button>
        </>}
      </section>
      {dailyReflection ? (
        <section className="summary-card reflection-card">
          <div className="section-title">
            <Sparkles size={18} />
            <h2 ref={resultHeading} tabIndex={-1}>{dailyReflection.title}</h2>
          </div>
          {dailyReflection.messages.map((message, index) => (
            <p key={index}>{message}</p>
          ))}
          {gentleInsight && !dailyReflection.messages.includes(gentleInsight.text) && (
            <div className="insight-card">
              <p className="eyebrow">最近のあなたから</p>
              <p>{gentleInsight.text}</p>
              <small>{gentleInsight.observations}件の記録から見えた傾向です。決めつけではありません。</small>
            </div>
          )}
          <span className="meta">Checkとこれまでの行動記録をもとにしています</span>
        </section>
      ) : (
        <section className="summary-card">
          <div className="section-title">
            <Sparkles size={18} />
            <h2>今日のあなた</h2>
          </div>
          <p>{buildTodaySummary(state, displayDate)}</p>
          <span className="meta">
            今日のCheck後に、今のあなたへ短い気づきを返します
          </span>
        </section>
      )}
      {active.length > 0 && (
        <section>
          <div className="section-title">
            <h2>やってみていること</h2>
          </div>
          {active.map((a) => (
            <div className="active-action" key={a.id}>
              <span>{a.title}</span>
              <button className="small-button" onClick={() => onComplete(a.id)}>
                できた
              </button>
            </div>
          ))}
        </section>
      )}
      <section>
        <div className="section-title">
          <div>
            <p className="eyebrow">無理に選ばなくても大丈夫</p>
            <h2>今日の過ごし方</h2>
          </div>
        </div>
        {dailyReflection ? (
          <>
            <p className="gentle-copy">
              今のあなたには、こんな過ごし方もよさそうです。
            </p>
            <div className="action-list">
              {recommendations
                .filter((r) => r.action.id !== 'do-nothing')
                .slice(0, 3)
                .map((r) => (
                  <ActionCard
                    key={r.action.id}
                    item={r}
                    onOpen={() => onOpenAction(r)}
                  />
                ))}
            </div>
            <button
              className="quiet-choice"
              onClick={() => onIntent('何もしない')}
            >
              今日は何もしない <span>→</span>
            </button>
          </>
        ) : (
          <p className="empty">
            気分をひとつ教えてくれたら、今日のあなたに合いそうな過ごし方を一緒に探せます。
          </p>
        )}
      </section>
      {dailyReflection && (
        <section className="daily-bridges">
          <button onClick={onFortune}>
            <b>今日の一枚</b>
            <span>Checkを別の角度から見てみる →</span>
          </button>
        </section>
      )}
      <section>
        <p className="eyebrow">今日は、自分のために何する？</p>
        <div className="intent-grid">
          {['整える', '楽しむ', '学ぶ', '休む'].map((x, i) => (
            <button key={x} onClick={() => onIntent(x)}>
              <b>{['🌿', '♫', '📖', '☾'][i]}</b>
              {x}
            </button>
          ))}
          <button onClick={onTalk}>
            <b>
              <MessageCircle size={23} />
            </b>
            話す
          </button>
          <button className="do-nothing" onClick={() => onIntent('何もしない')}>
            <b>○</b>今日は何もしない
          </button>
        </div>
      </section>
      {dailyReflection && (
        <section className="daily-bridges secondary-bridge">
          <button onClick={onTree}>
            <b>今日、印象に残った人はいましたか？</b>
            <span>My Treeに一言を残す（スキップできます） →</span>
          </button>
        </section>
      )}
      {timeBand === '夜' &&
        reflection.map((a) => (
          <section className="reflection" key={a.id}>
            <p className="eyebrow">夜の振り返り</p>
            <h2>「{a.title}」はどうだった？</h2>
            <div>
              {(
                [
                  ['great', '😍 よかった'],
                  ['okay', '🙂 まあまあ'],
                  ['same', '😐 変わらない'],
                  ['bad', '🙅 合わなかった'],
                ] as [FeedbackRating, string][]
              ).map(([r, l]) => (
                <button key={r} onClick={() => onFeedback(a.id, a.actionId, r)}>
                  {l}
                </button>
              ))}
            </div>
          </section>
        ))}
    </main>
  );
}
