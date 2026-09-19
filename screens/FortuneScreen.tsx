import { useMemo } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { drawFortune, fortuneMessage, jstDate } from '@/lib/fortune/engine';
import type { CamelliaState, DailyFortune, Recommendation } from '@/types';
export function FortuneScreen({
  state,
  recommendations,
  onBack,
  onSave,
  onTrack,
  onAction,
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
      | 'fortune_action_selected',
    p?: Record<string, string | number | boolean>,
  ) => void;
  onAction: (r: Recommendation) => void;
}) {
  const date = jstDate();
  const saved = state.fortunes.find((f) => f.date === date);
  const draw = useMemo(
    () => drawFortune(state.profile.id, date),
    [state.profile.id, date],
  );
  const choose = (status: 'drawn' | 'skipped') => {
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
      {!saved && (
        <section className="fortune-intro">
          <div className="tarot-back">✿</div>
          <h2>今日、占ってみる？</h2>
          <p>
            占いは、未来を決めるものじゃない。
            <br />
            今日の自分を知る、小さなきっかけ。
          </p>
          <button className="primary" onClick={() => choose('drawn')}>
            一枚引く
          </button>
          <button className="text-button" onClick={() => choose('skipped')}>
            今日は占わない
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
            <small>
              未来や健康状態を断定するものではありません。気になる言葉だけ受け取ってください。
            </small>
          </section>
          <section>
            <p className="eyebrow">今日、自分のために何する？</p>
            <h2>小さな行動を選ぶ</h2>
            <div className="fortune-actions">
              {recommendations
                .filter((r) => r.action.id !== 'do-nothing')
                .slice(0, 3)
                .map((r) => (
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
                    <span>→</span>
                  </button>
                ))}
            </div>
            <button
              className="quiet-choice"
              onClick={() => {
                const r = recommendations.find(
                  (x) => x.action.id === 'do-nothing',
                );
                if (r) {
                  onTrack('fortune_action_selected', { actionId: r.action.id });
                  onAction(r);
                }
              }}
            >
              今日は何もしない
            </button>
          </section>
        </>
      )}
    </main>
  );
}
