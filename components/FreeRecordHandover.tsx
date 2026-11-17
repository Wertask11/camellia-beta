'use client';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {schoolParkAuth} from '@/lib/schoolpark/firebase';
import {cloudContainsState,flushSchoolParkSync,getSyncStatus,subscribeSyncStatus} from '@/lib/schoolpark/sync';
import {beginFreeTransfer,bindFreeTransfer,finishFreeTransfer,markFreeTransferApplied,prepareFreeTransfer,protectFreeSource,readFreeTransfer,refreshBoundFreeSource} from '@/lib/free/handover';
import {FREE_STORAGE_KEY} from '@/lib/free/storage-key';
import type {useCamelliaStore} from '@/hooks/useCamelliaStore';
type Store=ReturnType<typeof useCamelliaStore>;
export function FreeRecordHandover({store,uid}:{store:Store;uid:string}){
 const [revision,setRevision]=useState(0),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[finished,setFinished]=useState(false),[dismissed,setDismissed]=useState(false);
 const track=store.track;
 const checking=useRef(false),checked=useRef('');
 const sync=useSyncExternalStore(subscribeSyncStatus,getSyncStatus,getSyncStatus);
 let intent:ReturnType<typeof readFreeTransfer>,plan:ReturnType<typeof prepareFreeTransfer>|undefined,hasLocal=false;
 try{intent=readFreeTransfer(localStorage);const raw=localStorage.getItem(FREE_STORAGE_KEY),v=raw?JSON.parse(raw):null;hasLocal=Boolean(v&&['checkins','actions','savedActions','aiConversations','treeLeaves','personalMemories','placeChoices','placeExperiences','fortunes'].some(k=>v[k]?.length));if(intent?.uid===uid)plan=prepareFreeTransfer(store.state,uid,localStorage);}catch{/* An explicit retry preserves the source. */}
 const confirm=useCallback(async()=>{if(checking.current)return;checking.current=true;setBusy(true);setError('');try{
  const pending=readFreeTransfer(localStorage);if(pending?.uid!==uid||pending.stage!=='applied'||schoolParkAuth.currentUser?.uid!==uid)return;
  await flushSchoolParkSync();if(await cloudContainsState(store.state,uid)&&schoolParkAuth.currentUser?.uid===uid){finishFreeTransfer(uid,pending.nonce,localStorage);track('record_transfer_complete',pending.entrySession?{entry_session:pending.entrySession}:{});setFinished(true);setNotice('記録をCamellia IDへ引き継ぎ、保存を確認しました。');}else setNotice('端末への取り込みは済みました。IDへの保存はまだ確認できていません。元の記録の控えは保護しています。');
 }catch{track('record_transfer_error',{reason:'unknown'});setError('保存を確認できませんでした。記録の控えはそのまま残しています。');}finally{checking.current=false;setBusy(false);}},[uid,store.state,track]);
 useEffect(()=>{if(intent?.stage!=='applied'||sync.phase!=='saved')return;const marker=intent.nonce+sync.at;if(checked.current===marker)return;checked.current=marker;void confirm();},[intent?.stage,intent?.nonce,sync.phase,sync.at,confirm]);
 if(dismissed||(!intent&&!hasLocal&&!finished))return null;
 if(finished)return <div className="app-notice-wrap"><output className="app-notice">記録をCamellia IDへ引き継ぎ、保存を確認しました。<button className="text-button" onClick={()=>setDismissed(true)}>閉じる</button></output></div>;
 if(intent?.uid&&intent.uid!==uid)return <section className="panel"><h2>端末の記録は控えに残っています</h2><p>別のIDで引き継ぎの途中です。自動でまとめません。以前の方法で入り直すと、確認を続けられます。</p></section>;
 const prepare=()=>{setError('');try{if(schoolParkAuth.currentUser?.uid!==uid)throw new Error('ACCOUNT_CHANGED');if(intent?.stage==='awaiting'){
   if(intent.expiresAt<=Date.now())beginFreeTransfer(intent.method,localStorage);bindFreeTransfer(uid,intent.method,localStorage);
  }else if(!intent){const method=schoolParkAuth.currentUser.providerData.some(p=>p.providerId==='password')?'email':schoolParkAuth.currentUser.providerData.some(p=>p.providerId==='google.com')?'google':'line';beginFreeTransfer(method,localStorage);bindFreeTransfer(uid,method,localStorage);}
  setRevision(revision+1);
 }catch{track('record_transfer_error',{reason:'unknown'});setError('引き継ぐ記録を確認できませんでした。元の端末記録は消していません。');}};
 const apply=()=>{setError('');try{if(schoolParkAuth.currentUser?.uid!==uid)throw new Error('ACCOUNT_CHANGED');const latest=prepareFreeTransfer(store.state,uid,localStorage);protectFreeSource(latest,uid,localStorage);store.restorePersonalBackup(latest.projection,store.state.profile.id);markFreeTransferApplied(uid,latest.intent.nonce,localStorage);setNotice('この端末へ記録を取り込みました。IDへの保存を確認しています。');setRevision(revision+1);}catch{track('record_transfer_error',{reason:'unknown'});setError('引き継ぎを完了できませんでした。元の記録を控えに残しています。別の画面で変更した場合は、確認し直してください。');}};
 return <section className="panel free-handover" aria-live="polite"><h2>登録前の記録を引き継ぐ</h2><p>今のCamellia ID{store.state.profile.name?`（${store.state.profile.name}さん）`:''}へ、不足している記録だけを追加します。現在の記録・削除済みの記録・設定を古い内容で上書きしません。</p>
  {plan&&intent?.stage==='bound'&&<><p>Check {plan.counts.checks}件・会話 {plan.counts.conversations}件・Memory {plan.counts.memories}件・My Tree {plan.counts.tree}件・振り返り {plan.counts.reflections}件・選択 {plan.counts.choices}件</p><p className="meta">これらは非公開の個人記録です。Circleや店舗、外部AIへ自動共有しません。</p><button className="primary" disabled={busy} onClick={apply}>確認した記録を、このIDへ引き継ぐ</button></>}
  {!finished&&intent?.stage==='bound'&&!plan&&<><p>元の端末記録が更新されています。自動では古い内容を取り込みません。</p><button className="secondary-button" onClick={()=>{try{refreshBoundFreeSource(uid,localStorage);setRevision(revision+1);setError('');}catch{track('record_transfer_error',{reason:'unknown'});setError('端末記録を確認できませんでした。元の控えは残しています。');}}}>最新の端末記録を確認する</button></>}
  {!finished&&(!intent||intent.stage==='awaiting')&&<button className="secondary-button" onClick={prepare}>この端末の記録を確認する</button>}
  {!finished&&intent&&['applying','applied'].includes(intent.stage)&&<><p className="meta">同期を確認するまで、元の記録の控えは削除しません。</p><button className="secondary-button" disabled={busy} onClick={()=>intent?.stage==='applying'?apply():void confirm()}>{busy?'保存を確認しています…':intent.stage==='applying'?'控えから、もう一度取り込む':'IDへの保存を確認する'}</button></>}
  {notice&&<output>{notice}</output>}{error&&<p role="alert">{error}</p>}
 </section>;
}
