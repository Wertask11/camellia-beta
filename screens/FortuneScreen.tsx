import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { drawFortune, fortuneMessage, jstDate } from '@/lib/fortune/engine';
import { recommend } from '@/lib/recommendation';
import type { TarotCard } from '@/data/tarot';
import type { CamelliaState, DailyFortune, Recommendation } from '@/types';

type Reflect = 'yes' | 'some' | 'no';
const REFLECT_CHOICES: [Reflect, string][] = [['yes', '重なる'], ['some', '少し'], ['no', '今日は違う']];
const reflectKey = (date: string) => `camellia-fortune-reflect:${date}`;
const readReflect = (date: string): Reflect | undefined => {
  try { const v = localStorage.getItem(reflectKey(date)); return v === 'yes' || v === 'some' || v === 'no' ? v : undefined; } catch { return undefined; }
};

/* 「変化」を、小さく試すなら: the existing recommendations, only reordered so that those matching the card's
   themes come first. No new judgement; 何もしない stays in Today's 今日どうする？. */
export function fortuneActions(card: TarotCard, recommendations: Recommendation[], limit = 2) {
  const fits = (r: Recommendation) => card.actionThemes.includes(r.action.category)
    || (card.actionThemes.includes('REFLECT') && ['three-lines', 'talk-ai'].includes(r.action.id));
  const pool = recommendations.filter(r => r.action.id !== 'do-nothing');
  return [...pool.filter(fits), ...pool.filter(r => !fits(r))].slice(0, limit);
}
export function FortuneScreen({
  state,
  recommendations,
  onBack,
  onSave,
  onTrack,
  onAction,
  onDecide,
}: {
  state: CamelliaState;
  recommendations: Recommendation[];
  onBack: () => void;
  onSave: (f: DailyFortune) => void;
  onTrack: (
    n:
      | 'fortune_draw'
      | 'fortune_complete'
      | 'fortune_skip'
      | 'fortune_action_selected'
      | 'fortune_reflect',
    p?: Record<string, string | number | boolean>,
  ) => void;
  onAction: (r: Recommendation) => void;
  onDecide?: () => void;
}) {
  const date = jstDate();
  const saved = state.fortunes.find((f) => f.date === date);
  /* 今日の一枚は、Checkした今日の自分を別の角度から見るためのもの。
     Checkの前には引けない（Todayからの入口もCheck後にしか出していない）。 */
  const checkedToday = state.checkins.some((c) => jstDate(new Date(c.createdAt)) === date);
  const chosen = useRef(false);
  const draw = useMemo(
    () => drawFortune(state.profile.id, date),
    [state.profile.id, date],
  );
  /* The answer stays on this device (not Firestore, not a reading's hit rate). Only yes/some/no is counted. */
  const [reflect, setReflect] = useState<Reflect | undefined>(() => readReflect(date));
  const answer = (value: Reflect) => {
    if (value === reflect) return;
    setReflect(value);
    try { localStorage.setItem(reflectKey(date), value); } catch { /* the answer is optional */ }
    onTrack('fortune_reflect', { value });
  };
  const actions = useMemo(
    () => fortuneActions(draw.card, recommend(state, new Date(), undefined, 6).concat(recommendations)
      .filter((r, i, all) => all.findIndex(x => x.action.id === r.action.id) === i)),
    [draw.card, state, recommendations],
  );
  const keyword = draw.card.keywords[0];
  const choose = (status: 'drawn' | 'skipped') => {
    /* 二度押しで fortune_draw が二重に数えられないようにする。1日1枚（日本時間）。 */
    if (saved || chosen.current) return;
    chosen.current = true;
    const now = new Date().toISOString();
    onSave({
      date,
      cardId: draw.card.id,
      orientation: draw.orientation,
      status,
      createdAt: now,
      updatedAt: now,
    });
    onTrack(status === 'drawn' ? 'fortune_draw' : 'fortune_skip', {
      cardId: draw.card.id,
    });
    if (status === 'drawn')
      onTrack('fortune_complete', { cardId: draw.card.id });
  };
  return (
    <main className="screen fortune">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={18} /> Todayへ
      </button>
      <header>
        <div>
          <p className="eyebrow">今日の自分を別の角度から</p>
          <h1>今日の一枚</h1>
        </div>
      </header>
      {!saved && !checkedToday && (
        <section className="fortune-intro">
          <div className="tarot-back">✿</div>
          <h2>まずは今日のCheckから</h2>
          <p>
            今日の一枚は、Checkした今日の自分を
            <br />
            別の角度から見るためのものです。
          </p>
          <button className="primary" onClick={onBack}>
            TodayでCheckする
          </button>
        </section>
      )}
      {!saved && checkedToday && (
        <section className="fortune-intro">
          <div className="tarot-back">✿</div>
          <h2>今の自分を、別の角度から。</h2>
          <p>
            占いは、未来を決めるものじゃない。
            <br />
            今日の自分を知る、小さなきっかけ。
          </p>
          <button className="primary" onClick={() => choose('drawn')}>
            一枚引く
          </button>
          <button className="text-button" onClick={() => choose('skipped')}>
            今日は引かない
          </button>
        </section>
      )}
      {saved?.status === 'skipped' && (
        <section className="empty fortune-skip">
          <h2>今日は自分で決める日。</h2>
          <p>占わない選択も、あなたらしい過ごし方です。</p>
        </section>
      )}
      {saved?.status === 'drawn' && (
        <>
          <section className="fortune-result">
            <div className="tarot-face">
              <Sparkles />
              <b>{draw.card.nameJa}</b>
              <span>{draw.card.nameEn}</span>
            </div>
            <p className="orientation">
              {draw.orientation === 'upright' ? '正位置' : '逆位置'}
            </p>
            <h2>{draw.card.keywords.join('・')}</h2>
            <p>{fortuneMessage(state, saved)}</p>
            <fieldset className="fortune-reflect">
              <legend className="fortune-question">
                「{keyword}」という言葉に、今日のあなたと重なるところはありますか？
              </legend>
              <div>
                {REFLECT_CHOICES.map(([value, label]) => (
                  <button key={value} aria-pressed={reflect === value} className={reflect === value ? 'selected' : ''} onClick={() => answer(value)}>
                    {reflect === value && <span aria-hidden="true">✓ </span>}{label}
                  </button>
                ))}
              </div>
            </fieldset>
            <small>
              未来や健康状態を断定するものではありません。気になる言葉だけ受け取ってください。
            </small>
          </section>
          {!!actions.length && <section className="fortune-try">
            <h2>「{keyword}」を、小さく試すなら</h2>
            <div className="fortune-actions">
              {actions.map((r) => (
                  <button
                    key={r.action.id}
                    onClick={() => {
                      onTrack('fortune_action_selected', {
                        actionId: r.action.id,
                      });
                      onSave({
                        ...saved,
                        actionId: r.action.id,
                        updatedAt: new Date().toISOString(),
                      });
                      onAction(r);
                    }}
                  >
                    {r.action.title}
                    <span aria-hidden="true">→</span>
                  </button>
                ))}
            </div>
          </section>}
        </>
      )}
      {saved && <button className="primary fortune-decide" onClick={onDecide || onBack}>Todayに戻って、今日どうするか決める</button>}
    </main>
  );
}
