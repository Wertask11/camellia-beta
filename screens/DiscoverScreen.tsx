import { useMemo } from 'react';
import { ActionCard } from '@/components/ActionCard';
import { CATEGORY_LABELS } from '@/data/actions';
import { recommend } from '@/lib/recommendation';
import type { CamelliaState, Category, Recommendation } from '@/types';
const cats=(Object.keys(CATEGORY_LABELS) as Category[]);
export function DiscoverScreen({state,category,onCategory,onOpenAction,onOpenSecondary}:{state:CamelliaState;category?:Category;onCategory:(c?:Category)=>void;onOpenAction:(r:Recommendation)=>void;onOpenSecondary:(x:'circle'|'place')=>void}) { const list=useMemo(()=>recommend(state,new Date(),category,20),[state,category]); return <main className="screen discover"><header><div><p className="eyebrow">今のあなたに合う選択肢</p><h1>Discover</h1></div></header><div className="category-scroll"><button className={!category?'selected':''} onClick={()=>onCategory(undefined)}>すべて</button>{cats.map(c=><button className={category===c?'selected':''} key={c} onClick={()=>onCategory(c)}>{CATEGORY_LABELS[c]}</button>)}</div><div className="action-list">{list.map(r=><ActionCard key={r.action.id} item={r} detail="description" onOpen={()=>onOpenAction(r)}/>)}</div><section className="secondary-links"><button onClick={()=>onOpenSecondary('circle')}>同じ気持ちの人とつながる <b>Circle →</b></button><button onClick={()=>onOpenSecondary('place')}>近くで体験する <b>Place →</b></button></section></main> }
