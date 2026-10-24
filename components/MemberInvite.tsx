'use client';
import { useState } from 'react';
import { firstInSession } from '@/lib/analytics/once';
import { formatInviteCode, memberInvite, type MemberInvite as Invite } from '@/lib/auth/access';

/* A member can invite up to three friends. Camellia is for women only: she hands the code to women she
   knows. Who invited whom is kept for the operator only (backend/camellia-access.js), never shown to others. */
const ERRORS: Record<string, string> = {
  PROFILE_REQUIRED: 'プロフィールで「私は女性です」を確かめて、記録の保存が終わると招待コードを作れます。少し待ってから、もう一度お試しください。',
  INVITE_REQUIRED: '招待コードを使ってから、友だちを招待できます。',
  SUSPENDED: 'このアカウントでは、友だちを招待できません。',
};
export function MemberInvite({onTrack}:{onTrack?:(name:'member_invite_open'|'member_invite_share',properties?:Record<string,string>)=>void}) {
  const [invite,setInvite]=useState<Invite|null>();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const load=async(create:boolean)=>{
    setBusy(true);setMessage('');
    try{
      const found=await memberInvite(create);setInvite(found);
      if(found&&firstInSession('camellia-member-invite-open'))onTrack?.('member_invite_open');
    }catch(error){setMessage(ERRORS[(error as {code?:string}).code??'']??'いまは表示できません。通信を確認して、もう一度お試しください。');}
    finally{setBusy(false);}
  };
  const text=invite?`Camelliaに招待します。18〜45歳の女性に限ったウェルビーイングのサービスです。\n招待コード：${formatInviteCode(invite.code)}\n${invite.url}`:'';
  const share=async()=>{
    if(!invite)return;
    try{
      if(navigator.share){await navigator.share({title:'Camelliaへの招待',text});onTrack?.('member_invite_share',{share_method:'share'});return;}
      await navigator.clipboard.writeText(text);onTrack?.('member_invite_share',{share_method:'copy'});setMessage('招待の文章をコピーしました。');
    }catch(error){if((error as {name?:string}).name!=='AbortError')setMessage('共有できませんでした。招待コードを書き写して渡してください。');}
  };
  const left=invite?Math.max(0,invite.maxUses-invite.uses):0;
  return <details className="member-invite" onToggle={e=>{if((e.target as HTMLDetailsElement).open&&invite===undefined&&!busy)void load(false);}}>
    <summary>友だちを招待する</summary>
    <section className="panel">
      <h2>友だちを招待する</h2>
      <p>Camelliaは、18〜45歳の女性に限ったサービスです。招待できるのは3人までです。</p>
      {invite===undefined&&busy&&<p className="meta">読み込んでいます…</p>}
      {invite===null&&<button className="primary" disabled={busy} onClick={()=>void load(true)}>{busy?'作っています…':'招待コードを作る'}</button>}
      {invite&&<>
        <p className="invite-code" aria-label="招待コード">{formatInviteCode(invite.code)}</p>
        <p className="meta">{left>0?`あと${left}人招待できます。`:'招待できる人数に達しました。'}</p>
        {left>0&&<button className="primary" onClick={()=>void share()}>招待を送る</button>}
      </>}
      {message&&<output className="meta member-invite-status">{message}</output>}
    </section>
  </details>;
}
