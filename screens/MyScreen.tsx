import { useState } from 'react';
import { ACTIONS } from '@/data/actions';
import { generateInsights } from '@/lib/insight/engine';
import type { CamelliaState,Profile } from '@/types';

export function MyScreen({state,devNight,onProfile,onReset,onInsight,onPrivacy,onDevNight}:{state:CamelliaState;devNight:boolean;onProfile:(p:Partial<Profile>)=>void;onReset:()=>void;onInsight:(key:string,v:'correct'|'incorrect')=>void;onPrivacy:()=>void;onDevNight:(value:boolean)=>void}) {
  const insights=generateInsights(state);
  const [confirmDelete,setConfirmDelete]=useState(false);
  return <main className="screen my"><header><div><p className="eyebrow">Camelliaの記憶</p><h1>My Camellia</h1></div></header>
    <section className="insights"><p className="eyebrow">Camelliaがあなたについて気づいたこと</p><h2>今週の気づき</h2>{insights.length?insights.map(i=><article className="insight-card" key={i.key}><p>{i.text}</p><small>{i.sampleSize}件の記録から考えた仮説です</small><div><button onClick={()=>onInsight(i.key,'correct')}>合ってる</button><button onClick={()=>onInsight(i.key,'incorrect')}>ちょっと違う</button></div></article>):<div className="empty"><b>まだ分からないこともたくさんあります。</b><br/>少しずつ一緒に見つけていきましょう。</div>}</section>
    <section className="panel"><h2>プロフィール</h2><label>呼び名<input value={state.profile.name} onChange={e=>onProfile({name:e.target.value})}/></label><label>年代<select value={state.profile.age} onChange={e=>onProfile({age:e.target.value})}><option value="">未設定</option><option>20代</option><option>30代</option><option>40代</option><option>50代以上</option></select></label><label className="toggle"><input type="checkbox" checked={state.profile.periodEnabled} onChange={e=>onProfile({periodEnabled:e.target.checked})}/> 生理情報を提案に使う</label></section>
    <section><h2>あとで見る</h2>{state.savedActions.length?state.savedActions.map(s=><div className="history-row" key={s.id}><span>{ACTIONS.find(a=>a.id===s.actionId)?.title}</span><small>{{later_today:'今日あとで',holiday:'休日に',when_free:'時間があるとき',save_only:'保存だけ'}[s.timing]}</small></div>):<p className="empty">保存した行動はありません</p>}</section>
    <section><h2>状態の履歴</h2>{state.checkins.length?[...state.checkins].reverse().map(c=><div className="history-row" key={c.id}><span>{['','😣','😔','😐','🙂','😊'][c.mood]} {c.sleep!==undefined?`睡眠 ${c.sleep}h`:''} {c.stress?`・ストレス ${c.stress}`:''}</span><small>{new Date(c.createdAt).toLocaleString('ja-JP')}</small></div>):<p className="empty">まだ記録がありません</p>}</section>
    <section className="safety-note"><strong>Camelliaは医療診断を行うサービスではありません。</strong><span>体調に不安がある場合は専門家へ相談してください。</span></section>
    <details><summary>その他</summary><button className="settings-link" onClick={onPrivacy}>プライバシーと保存データ</button><label className="dev-toggle"><input type="checkbox" checked={devNight} onChange={e=>onDevNight(e.target.checked)}/> 開発用：夜の振り返りを表示</label><button className="danger-link" onClick={()=>setConfirmDelete(true)}>保存データを削除する</button></details>
    {confirmDelete&&<div className="modal-backdrop"><section className="sheet compact"><h2>保存データを削除しますか？</h2><p>このブラウザに保存されたプロフィール、記録、会話、学習内容が削除されます。この操作は元に戻せません。</p><div className="sheet-actions"><button onClick={()=>setConfirmDelete(false)}>キャンセル</button><button className="danger-button" onClick={onReset}>削除する</button></div></section></div>}
  </main>
}
