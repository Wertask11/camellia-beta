'use client';
import { useEffect, useState } from 'react';
import { firstInSession } from '@/lib/analytics/once';
import { formatInviteCode, INVITE_MESSAGES, normalizeInviteCode, redeemInvite, type InviteResult } from '@/lib/auth/access';

/* Camellia is for women only and, while invites are on, new people need a code from the operator or
   from a member. The code a link brought is filled in; she only has to press the button. */
export function InviteScreen({initialCode,initialResult,onAccepted,onTrack,onLogout}:{
  initialCode:string;
  initialResult?:InviteResult;
  onAccepted:(result:{kind?:'operator'|'member';label?:string})=>void;
  onTrack:(name:'invite_view'|'invite_submit',properties:Record<string,string|boolean>)=>void;
  onLogout:()=>void;
}) {
  const [code,setCode]=useState(initialCode?formatInviteCode(initialCode):'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(initialResult&&initialResult!=='accepted'&&initialResult!=='already'?INVITE_MESSAGES[initialResult]:'');
  useEffect(()=>{if(firstInSession('camellia-invite-view'))onTrack('invite_view',{from_link:Boolean(initialCode)});},[]);// oxlint-disable-line react-hooks/exhaustive-deps -- once per session
  const submit=async()=>{
    const clean=normalizeInviteCode(code);
    if(!clean){setError(INVITE_MESSAGES.invalid);onTrack('invite_submit',{result:'invalid',from_link:clean===initialCode&&Boolean(initialCode)});return;}
    setBusy(true);setError('');
    const answer=await redeemInvite(clean);
    onTrack('invite_submit',{result:answer.result,from_link:clean===initialCode});
    setBusy(false);
    if(answer.result==='accepted'||answer.result==='already'){onAccepted(answer);return;}
    setError(INVITE_MESSAGES[answer.result]);
  };
  return <main className="screen invite-screen">
    <header><div><p className="eyebrow">Camellia</p><h1>招待コードを入力してください</h1></div></header>
    <p>Camelliaは、18〜45歳の女性に限ったサービスです。いまは、招待コードをお持ちの方に使っていただいています。</p>
    <form onSubmit={e=>{e.preventDefault();void submit();}}>
      <label>招待コード（8文字）<input value={code} onChange={e=>setCode(e.target.value)} autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} maxLength={12} placeholder="K7QM-2XPA" inputMode="text"/></label>
      {error&&<p className="auth-error" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={busy||!code.trim()}>{busy?'確かめています…':'招待コードを使う'}</button>
    </form>
    <p className="meta">招待コードは、Camelliaの運営や、Camelliaを使っている友だちから受け取れます。お持ちでない方は、ご案内を受け取るまでお待ちください。</p>
    <button className="secondary-button" onClick={onLogout}>ログアウトする</button>
  </main>;
}

/* Stopped by the operator (for example, not eligible). Records are kept; she can still log out or ask. */
export function SuspendedScreen({onLogout,onTrack}:{onLogout:()=>void;onTrack:(name:'access_suspended_view')=>void}) {
  useEffect(()=>{if(firstInSession('camellia-suspended-view'))onTrack('access_suspended_view');},[]);// oxlint-disable-line react-hooks/exhaustive-deps -- once per session
  return <main className="screen invite-screen">
    <header><div><p className="eyebrow">Camellia</p><h1>このアカウントの利用を止めています</h1></div></header>
    <p>Camelliaは、18〜45歳の女性に限ったサービスです。<a href="/terms.html" target="_blank" rel="noreferrer">利用規約</a>にもとづき、このアカウントの利用を止めています。記録は消していません。</p>
    <p className="meta">心当たりがない場合は、利用規約にある問い合わせ先へご連絡ください。</p>
    <button className="secondary-button" onClick={onLogout}>ログアウトする</button>
  </main>;
}
