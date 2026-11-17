'use client';
import {identityEvent} from '@/lib/analytics/identity';
import {CAMELLIA_MESSAGE} from '@/lib/brand';
import {useCallback,useEffect,useRef,useState} from 'react';
import {GoogleAuthProvider,signInWithPopup} from 'firebase/auth';
import {schoolParkAuth} from '@/lib/schoolpark/firebase';
import {finishAuthCallback,startLineLogin} from '@/lib/auth/camellia';
import {emailIdService,emailIdError,stripEmailCallback} from '@/lib/auth/email-id';
import {beginFreeTransfer,bindFreeTransfer,cancelFreeTransfer} from '@/lib/free/handover';

export function CamelliaIdentityScreen({onDone,onBack}:{onDone:()=>void;onBack:()=>void}){
 const [email,setEmail]=useState(''),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState(''),[returningLink,setReturningLink]=useState('');
 const started=useRef(false),link=useRef(typeof location==='undefined'?'':location.href);
 const done=useCallback((uid:string,method:'email'|'google'|'line',linked=false)=>{if(schoolParkAuth.currentUser?.uid!==uid)throw new Error('EMAIL_AUTH_CHANGED');if(!linked)bindFreeTransfer(uid,method,localStorage);identityEvent('camellia_id_complete',method,linked);sessionStorage.removeItem('camellia-id-entry');onDone();},[onDone]);
 const completeEmail=useCallback(async(url:string,address?:string,consent=false)=>{setBusy(true);setError('');try{const result=await emailIdService().complete(url,address,consent);done(result.uid,'email',result.linked);}catch(e){identityEvent('camellia_id_error');setError(emailIdError(e));setBusy(false);}},[done]);
 useEffect(()=>{
  if(started.current)return;started.current=true;identityEvent('camellia_id_prompt_view');
  const url=link.current;
  try{if(new URL(url).searchParams.has('oobCode'))history.replaceState({},'',stripEmailCallback(new URL(url)));
  if(emailIdService().isLink(url)){
   history.replaceState({},'',stripEmailCallback(new URL(url)));setReturningLink(url);
   const pending=emailIdService().pending();if(pending){setEmail(pending.email);setAccepted(pending.targetAcknowledged);void completeEmail(url);}
   return;
  }
  if(new URL(url).searchParams.has('code')||new URL(url).searchParams.has('camellia_passport_ticket')){
   setBusy(true);void finishAuthCallback().then(result=>{const user=schoolParkAuth.currentUser;if(!result||!user||user.isAnonymous||result.method==='schoolpark')throw new Error('EMAIL_AUTH_CHANGED');done(user.uid,result.method);}).catch(e=>{setError(emailIdError(e));setBusy(false);});
  }
  }catch(e){identityEvent('camellia_id_error');setError(emailIdError(e));setBusy(false);}
 },[done,completeEmail]);
 const send=async()=>{if(busy)return;identityEvent('camellia_id_start','email');setBusy(true);setError('');try{beginFreeTransfer('email',localStorage);await emailIdService().request(email,location.origin,'signin',accepted);setSent(true);}catch(e){identityEvent('camellia_id_error');setError(emailIdError(e));}finally{setBusy(false);}};
 const google=async()=>{if(busy)return;identityEvent('camellia_id_start','google');setBusy(true);setError('');try{if(schoolParkAuth.currentUser&&!schoolParkAuth.currentUser.isAnonymous)throw new Error('EMAIL_AUTH_CHANGED');beginFreeTransfer('google',localStorage);const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});const result=await signInWithPopup(schoolParkAuth,p);done(result.user.uid,'google');}catch(e){identityEvent('camellia_id_error');setError(emailIdError(e));setBusy(false);}};
 const lineLogin=()=>{if(busy)return;identityEvent('camellia_id_start','line');setBusy(true);setError('');try{if(schoolParkAuth.currentUser&&!schoolParkAuth.currentUser.isAnonymous)throw new Error('EMAIL_AUTH_CHANGED');beginFreeTransfer('line',localStorage);startLineLogin();}catch(e){identityEvent('camellia_id_error');setError(emailIdError(e));setBusy(false);}};
 return <main className="screen identity-screen"><button className="back" disabled={busy} onClick={()=>{cancelFreeTransfer(localStorage);onBack();}}>← 登録せずに戻る</button><p className="eyebrow">Camellia ID · 無料</p><h1>今日のあなたを、<br/>別の端末へも。</h1><p className="meta">{CAMELLIA_MESSAGE}</p><p>基本機能は登録せずに使えます。記録を引き継ぎたいときだけ、メールで確認します。パスワードは作りません。</p>
  {sent&&!returningLink?<section className="panel" aria-live="polite"><h2>確認メールの送信を受け付けました</h2><p>メールのリンクを開いてください。届かない場合は迷惑メールも確認できます。端末の記録はそのまま残っています。</p><button className="secondary-button" disabled={busy} onClick={()=>setSent(false)}>メールアドレスを確認する</button></section>:<form onSubmit={e=>{e.preventDefault();if(returningLink)void completeEmail(returningLink,email,accepted);else void send();}}>
   <label>メールアドレス<input type="email" inputMode="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy}/></label>
   <label className="check-row"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} disabled={busy}/>サービスの対象（18〜45歳の女性）であることを確認し、利用規約・プライバシーポリシーに同意します。</label><p className="meta"><a href="/terms.html" target="_blank" rel="noopener">利用規約</a>・<a href="/privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a></p>
   <button className="primary" disabled={busy||!email.trim()||!accepted}>{busy?'確認しています…':returningLink?'メールを確認して続ける':'確認メールを受け取る'}</button>{returningLink&&<p className="meta">確認メールを受け取ったアドレスを入力してください。この画面を閉じた場合は、メールのリンクを開き直せます。</p>}
  </form>}
  {error&&<p role="alert" className="auth-error">{error}</p>}
  <p className="meta">IDへ引き継ぐ記録はFirebaseに保存・同期され、権限を持つ運営担当者が内容を確認する場合があります。引き継ぐ前に対象の記録を確認できます。</p><details><summary>以前のLINE・Googleで続ける</summary><p>すでに記録がある方は、前と同じ方法でお入りください。メールの追加はMyからできます。</p><button className="secondary-button" disabled={busy} onClick={lineLogin}>LINEで続ける</button><button className="secondary-button" disabled={busy} onClick={()=>void google()}>Googleで続ける</button></details>
 </main>;
}
