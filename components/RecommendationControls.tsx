import {CATEGORY_LABELS} from '@/data/actions';
import type {Category} from '@/types';
import type {RecommendationFilter} from '@/lib/recommendation/adjustments';
export function RecommendationControls({value,onChange}:{value:RecommendationFilter;onChange:(value:RecommendationFilter)=>void}){
 return <section className="recommendation-controls" aria-label="提案を自分で調整"><h3>今日は、どんな過ごし方にする？</h3><div className="place-filters"><label>希望<select aria-label="過ごし方の希望" value={value.category??''} onChange={e=>onChange({...value,category:(e.target.value||undefined) as Category|undefined})}><option value="">自由に選ぶ</option>{Object.entries(CATEGORY_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>使える時間<select aria-label="使える時間" value={value.maxMinutes??''} onChange={e=>onChange({...value,maxMinutes:e.target.value===''?undefined:Number(e.target.value)})}><option value="">決めない</option>{[2,5,10,15,30,60].map(v=><option key={v} value={v}>{v}分以内</option>)}</select></label></div><p className="meta">今日のCheckは入力した場合だけ参考にします。選んだ条件と、これまでの過ごし方から、この端末で候補を並べます。合わなければ選ばなくて大丈夫です。</p></section>;
}
