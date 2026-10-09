import { useMemo } from 'react';
import { ActionCard } from '@/components/ActionCard';
import { CATEGORY_LABELS } from '@/data/actions';
import { recommend } from '@/lib/recommendation';
import { dailyCheckins } from '@/lib/reflection/engine';
import { jstDate } from '@/lib/fortune/engine';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import type { CamelliaState, Category, Recommendation } from '@/types';
const cats=(Object.keys(CATEGORY_LABELS) as Category[]);
export function DiscoverScreen({state,category,onCategory,onOpenAction,onOpenSecondary}:{state:CamelliaState;category?:Category;onCategory:(c?:Category)=>void;onOpenAction:(r:Recommendation)=>void;onOpenSecondary:(x:'circle'|'place')=>void}) {
  const now=useCurrentTime(state.checkins);
  const list=useMemo(()=>recommend(state,now,category,20),[state,category,now]);
  const checked=dailyCheckins(state.checkins,now).some(check=>jstDate(new Date(check.createdAt))===jstDate(now));
  // These are existing actions ranked by the existing engine, not generated articles.
  const forToday=useMemo(()=>checked&&!category?recommend(state,now,undefined,3).filter(item=>item.action.id!=='do-nothing'):[],[state,now,checked,category]);
  return <main className="screen discover"><header><div><p className="eyebrow">今日の私に関係するものと出会う</p><h1>Discover</h1></div></header>
    <p className="gentle-copy">自分のための、小さな過ごし方を探す場所です。{checked?'今日のCheckと、これまでの選択を手がかりに並べています。':'気になるものから、自由に見てみてください。'}</p>
    {!!forToday.length&&<section className="discover-today" aria-labelledby="discover-today-title"><h2 id="discover-today-title">今日のあなたに</h2><p className="meta">選ぶかどうかは、今の気持ちで。</p><div className="action-list">{forToday.map(r=><ActionCard key={r.action.id} item={r} detail="description" onOpen={()=>onOpenAction(r)}/>)}</div></section>}
    <div className="category-scroll" aria-label="過ごし方のカテゴリ"><button aria-pressed={!category} className={!category?'selected':''} onClick={()=>onCategory(undefined)}>すべて</button>{cats.map(c=><button aria-pressed={category===c} className={category===c?'selected':''} key={c} onClick={()=>onCategory(c)}>{CATEGORY_LABELS[c]}</button>)}</div>
    {!!forToday.length&&<h2>ほかの過ごし方も</h2>}
    <div className="action-list">{list.filter(r=>!forToday.some(item=>item.action.id===r.action.id)).map(r=><ActionCard key={r.action.id} item={r} detail="description" onOpen={()=>onOpenAction(r)}/>)}</div><section className="secondary-links"><button onClick={()=>onOpenSecondary('circle')}>同じ気持ちの人とつながる <b>Circle →</b></button><button onClick={()=>onOpenSecondary('place')}>近くで体験する <b>Place →</b></button></section>
  </main>;
}
