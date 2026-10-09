import { useMemo } from 'react';
import { ActionCard } from '@/components/ActionCard';
import { CATEGORY_LABELS } from '@/data/actions';
import { recommend } from '@/lib/recommendation';
import { dailyCheckins } from '@/lib/reflection/engine';
import { jstDate } from '@/lib/fortune/engine';
import { LIVE_DESTINATIONS } from '@/lib/features';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import { todayPlans } from '@/lib/today/flow';
import type { CamelliaState, Category, Recommendation } from '@/types';
const cats=(Object.keys(CATEGORY_LABELS) as Category[]);
/* Discover is where Today continues: categories first, and never the same three plans Today already showed. */
export function DiscoverScreen({state,category,onCategory,onOpenAction,onOpenSecondary}:{state:CamelliaState;category?:Category;onCategory:(c?:Category)=>void;onOpenAction:(r:Recommendation)=>void;onOpenSecondary:(x:'circle'|'place')=>void}) {
  const now=useCurrentTime(state.checkins);
  const list=useMemo(()=>recommend(state,now,category,20),[state,category,now]);
  const checked=dailyCheckins(state.checkins,now).some(check=>jstDate(new Date(check.createdAt))===jstDate(now));
  // The three Today shows (the same engine, the same order); existing actions, not generated articles.
  const todayIds=useMemo(()=>checked?todayPlans(state,now).map(item=>item.action.id):[],[state,now,checked]);
  const rest=list.filter(r=>!todayIds.includes(r.action.id));
  const liveSecondary=(['circle','place'] as const).filter(x=>LIVE_DESTINATIONS.has(x));
  return <main className="screen discover"><header><div><p className="eyebrow">今日の私に関係するものと出会う</p><h1>Discover</h1></div></header>
    <p className="gentle-copy explain">自分のための、小さな過ごし方を探す場所です。</p>
    <div className="category-scroll" aria-label="過ごし方のカテゴリ"><button aria-pressed={!category} className={!category?'selected':''} onClick={()=>onCategory(undefined)}>すべて</button>{cats.map(c=><button aria-pressed={category===c} className={category===c?'selected':''} key={c} onClick={()=>onCategory(c)}>{CATEGORY_LABELS[c]}</button>)}</div>
    {checked?<section className="discover-rest" aria-labelledby="discover-rest-title"><h2 id="discover-rest-title">Todayの提案とは別に</h2><p className="meta">今日のCheckに近い順。Todayに出した{todayIds.length}件は除いています。</p></section>
      :<p className="meta discover-hint">気になるものから、自由に見てみてください。</p>}
    <div className="action-list">{rest.map(r=><ActionCard key={r.action.id} item={r} detail="description" whole onOpen={()=>onOpenAction(r)}/>)}</div>
    {!rest.length&&<p className="empty">このカテゴリは、Todayに出したものだけでした。ほかのカテゴリも見てみてください。</p>}
    {liveSecondary.length?<section className="secondary-links">{liveSecondary.map(x=><button key={x} onClick={()=>onOpenSecondary(x)}>{x==='circle'?'同じ気持ちの人とつながる':'近くで体験する'} <b>{x==='circle'?'Circle':'Place'} →</b></button>)}</section>
      :<p className="coming-places"><b>これから増える場所（準備中）</b><span>Circle：同じ気持ちの人とつながる ・ Place：近くで体験する</span></p>}
  </main>;
}
