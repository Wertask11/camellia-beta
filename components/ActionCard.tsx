/* oxlint-disable next/no-img-element -- external editorial images are intentionally unoptimized in this prototype */
import type { Recommendation } from '@/types';

/** detail: why Camellia suggests it (Today), or what it is (Discover, where the person looks for themselves). */
export function ActionCard({ item, onOpen, detail = 'reason' }: { item: Recommendation; onOpen: () => void; detail?: 'reason' | 'description' }) {
  return <article className="action-card">
    <img src={item.action.image} alt="" />
    <div className="action-copy"><span className="eyebrow">{item.action.discoverCategory} · {item.action.minutes ? `${item.action.minutes}分` : '時間を決めない'}</span><h3>{item.action.title}</h3><p>{detail === 'description' ? item.action.description : `${item.reasons.join('、')}。`}</p></div>
    <button className="small-button" onClick={onOpen}>選ぶ</button>
  </article>;
}
