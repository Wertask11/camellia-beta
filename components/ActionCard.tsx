/* oxlint-disable next/no-img-element -- external editorial images are intentionally unoptimized in this prototype */
import type { Recommendation } from '@/types';

export function ActionCard({ item, onOpen }: { item: Recommendation; onOpen: () => void }) {
  return <article className="action-card">
    <img src={item.action.image} alt="" />
    <div className="action-copy"><span className="eyebrow">{item.action.discoverCategory} · {item.action.minutes ? `${item.action.minutes}分` : '時間を決めない'}</span><h3>{item.action.title}</h3><p>{item.reasons.join('、')}。</p></div>
    <button className="small-button" onClick={onOpen}>選ぶ</button>
  </article>;
}
