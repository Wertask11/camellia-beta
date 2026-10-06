import { useState,useSyncExternalStore } from 'react';
import {getSyncStatus,subscribeSyncStatus,flushSchoolParkSync} from '@/lib/schoolpark/sync';
import { ACTIONS } from '@/data/actions';
import { generateInsights } from '@/lib/insight/engine';
import { AccountSettings } from '@/components/AccountSettings';
import type { CamelliaState } from '@/types';

export function MyScreen({state,devNight,onEditProfile,onForget,onReset,onInsight,onPrivacy,onTree,onDevNight}:{state:CamelliaState;devNight:boolean;onEditProfile:()=>void;onForget:(id:string)=>void;onReset:()=>void|Promise<void|{cloudDeleted:boolean}>;onInsight:(key:string,v:'correct'|'incorrect')=>void;onPrivacy:()=>void;onTree:()=>void;onDevNight:(value:boolean)=>void}) {
  const insights=generateInsights(state);
  const sync=useSyncExternalStore(subscribeSyncStatus,getSyncStatus,getSyncStatus);
  const backups=typeof window==='undefined'?[]:Object.keys(localStorage).filter(key=>key.startsWith('camellia-local-backup:'));
  const exportBackups=()=>{const data=backups.map(key=>({key,data:JSON.parse(localStorage.getItem(key)||'null')}));const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='camellia-preserved-records.json';link.click();URL.revokeObjectURL(url);};
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const [deleteError,setDeleteError]=useState('');
  const [deleteResult,setDeleteResult]=useState('');
  const deleteData=async()=>{setDeleting(true);setDeleteError('');setDeleteResult('');try{const result=await onReset();setDeleteResult(result&&typeof result==='object'&&'cloudDeleted'in result&&result.cloudDeleted?'端末内と同期先のCamelliaデータを削除しました。PostHogへ送信済みの操作イベントは削除されていません。':'端末内のCamelliaデータを削除しました。ログイン中の同期先データはありません。PostHogへ送信済みの操作イベントは削除されていません。')}catch(error){const code=error instanceof Error?error.message:'';setDeleteError(code==='SIGN_IN_TO_DELETE_SYNCED_DATA'?'以前同期した記録があります。同期したSchoolParkアカウントにログインしてから削除してください。':code==='OTHER_SCHOOLPARK_ACCOUNTS_HAVE_SYNCED_DATA'?'この端末の記録は別のSchoolParkアカウントにも同期されています。そのアカウントへ切り替えて削除してください。':'同期データを削除できませんでした。端末内データは削除していません。通信を確認して、もう一度お試しください。');setDeleting(false);return}setDeleting(false);setConfirmDelete(false)};
  return <main className="screen my"><header><div><p className="eyebrow">Camelliaの記憶</p><h1>My Camellia</h1></div></header>
    <button className="my-tree-entry" onClick={onTree}><span className="tree-mini">♧</span><span><b>My Tree</b><small>人とのつながりから、自分を知る</small></span><strong>{state.treeLeaves.filter(l=>l.status==='active').length}枚の葉 →</strong></button>
    <AccountSettings/>
    <section className="insights"><p className="eyebrow">Camelliaがあなたについて気づいたこと</p><h2>今週の気づき</h2>{insights.length?insights.map(i=><article className="insight-card" key={i.key}><p>{i.text}</p><small>{i.sampleSize}件の記録から考えた仮説です</small><div><button onClick={()=>onInsight(i.key,'correct')}>合ってる</button><button onClick={()=>onInsight(i.key,'incorrect')}>ちょっと違う</button></div></article>):<div className="empty"><b>まだ分からないこともたくさんあります。</b><br/>少しずつ一緒に見つけていきましょう。</div>}</section>
    <section className="panel"><h2>プロフィール</h2><p>{state.profile.name}</p><button className="secondary-button" onClick={onEditProfile}>プロフィールを確認・編集する</button></section>
    <section className="panel"><h2>記録の保存</h2><p>{sync.phase==='saved'?'アカウントへの保存を確認しました。':sync.phase==='pending'?'端末の記録をアカウントへ保存しています。':sync.phase==='error'?'端末の記録は残っていますが、アカウントへの保存を確認できませんでした。':'アカウントへの保存状態を確認しています。'}</p>{sync.at&&<small>最終確認：{new Date(sync.at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}</small>}{sync.phase==='error'&&<><p role="alert">{sync.error==='SYNC_CONFLICT'?'別端末の更新があるため、自動で上書きしていません。再読み込みして記録を確認してください。':'通信を確認して、もう一度お試しください。'}</p><button className="secondary-button" onClick={()=>void flushSchoolParkSync()}>保存をもう一度確認する</button></>}</section>
    {backups.length>0&&<section className="panel"><h2>別に残した端末の記録</h2><p>アカウントの記録を開いたときの控えが{backups.length}件あります。</p><button className="secondary-button" onClick={exportBackups}>控えをファイルに保存する</button></section>}
    <section><h2>Camelliaに覚えてもらったこと</h2>{(state.personalMemories??[]).filter(item=>item.status!=='removed').map(item=><article className="panel" key={item.id}><p>{item.text}</p><button className="text-button" onClick={()=>onForget(item.id)}>この一言をMemoryから外す</button></article>)}{!(state.personalMemories??[]).some(item=>item.status!=='removed')&&<p className="meta">会話で保存を選んだ一言だけが、ここに残ります。</p>}</section>
    <section><h2>あとで見る</h2>{state.savedActions.length?state.savedActions.map(s=><div className="history-row" key={s.id}><span>{ACTIONS.find(a=>a.id===s.actionId)?.title}</span><small>{{later_today:'今日あとで',holiday:'休日に',when_free:'時間があるとき',save_only:'保存だけ'}[s.timing]}</small></div>):<p className="empty">保存した行動はありません</p>}</section>
    <section><h2>状態の履歴</h2>{state.checkins.length?[...state.checkins].reverse().map(c=><div className="history-row" key={c.id}><span>{['','😣','😔','😐','🙂','😊'][c.mood]} {c.sleep!==undefined?`睡眠 ${c.sleep}h`:''} {c.stress?`・ストレス ${c.stress}`:''}</span><small>{new Date(c.createdAt).toLocaleString('ja-JP')}</small></div>):<p className="empty">まだ記録がありません</p>}</section>
    <section className="safety-note"><strong>Camelliaは医療診断を行うサービスではありません。</strong><span>体調に不安がある場合は専門家へ相談してください。</span></section>
    <details><summary>その他</summary><button className="settings-link" onClick={onPrivacy}>プライバシーと保存データ</button><label className="dev-toggle"><input type="checkbox" checked={devNight} onChange={e=>onDevNight(e.target.checked)}/> 開発用：夜の振り返りを表示</label><button className="danger-link" onClick={()=>setConfirmDelete(true)}>保存データを削除する</button></details>
    {deleteResult&&<output className="empty">{deleteResult}</output>}
    {confirmDelete&&<div className="modal-backdrop"><section className="sheet compact"><h2>保存データを削除しますか？</h2><p>端末内のプロフィール、記録、会話を削除します。ログイン中で同期済みのSchoolParkアカウントがある場合は、そのCamellia記録も削除します。未ログインで過去の同期履歴が確認された場合は削除を止め、同期したアカウントへのログインを案内します。運営用の管理記録・返信とPostHogへ送信済みの操作イベントは削除されません。この操作は元に戻せません。</p>{deleteError&&<p className="auth-error" role="alert">{deleteError}</p>}<div className="sheet-actions"><button disabled={deleting} onClick={()=>setConfirmDelete(false)}>キャンセル</button><button className="danger-button" disabled={deleting} onClick={()=>void deleteData()}>{deleting?'削除しています…':'削除する'}</button></div></section></div>}
  </main>
}
