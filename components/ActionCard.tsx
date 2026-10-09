/* oxlint-disable next/no-img-element -- external editorial images are intentionally unoptimized in this prototype */
import type { Recommendation } from '@/types';

/** detail: why Camellia suggests it (Today), or what it is (Discover, where the person looks for themselves).
 * whole: the whole card is the button (Discover), instead of a small 「選ぶ」 inside it. */
export function ActionCard({ item, onOpen, detail = 'reason', whole = false }: { item: Recommendation; onOpen: () => void; detail?: 'reason' | 'description'; whole?: boolean }) {
  const meta = `${item.action.discoverCategory} · ${item.action.minutes ? `${item.action.minutes}分` : '時間を決めない'}`;
  const text = detail === 'description' ? item.action.description : `${item.reasons.join('、')}。`;
  if (whole) return <button type="button" className="action-card action-card--whole" aria-label={`${item.action.title}（${meta}）`} onClick={onOpen}>
    <img src={item.action.image} alt="" />
    <span className="action-copy"><span className="eyebrow">{meta}</span><span className="action-title">{item.action.title}</span><span className="action-text">{text}</span></span>
  </button>;
  return <article className="action-card">
    <img src={item.action.image} alt="" />
    <div className="action-copy"><span className="eyebrow">{meta}</span><h3>{item.action.title}</h3><p>{text}</p></div>
    <button className="small-button" onClick={onOpen}>選ぶ</button>
  </article>;
}
