'use client';
import {useEffect,useRef,useState} from 'react';
import {shareRequest} from '@/lib/partner/client';
import type {PublicShare} from '@/lib/partner/model';
import type {AnalyticsEventName} from '@/types';
export function PartnerShareScreen({token,onBack,onTrack}:{token:string;onBack:()=>void;onTrack:(name:AnalyticsEventName)=>void}){
 const [share,setShare]=useState<PublicShare>(),[error,setError]=useState(''),sent=useRef(false);
 useEffect(()=>{let active=true;void shareRequest({operation:'read',token},true).then(v=>{if(active)setShare(v.share);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[token]);
 useEffect(()=>{if(share&&!sent.current){sent.current=true;onTrack('partner_share_open');}},[share,onTrack]);
 return <main className="screen partner-public"><p className="eyebrow">Camelliaから、あなたへ</p><h1>伝えたいこと</h1>{error?<p role="alert">{error}</p>:share?<article className="share-preview"><h2>{share.title}</h2><p>{share.timing==='today'?'今日の希望です。':'今度、一緒にしてみたいことです。'}</p><p>{share.description}</p>{share.demo&&<strong>デモ・掲載イメージです。実在店舗ではありません。</strong>}<p className="meta">{new Date(share.expiresAt).toLocaleDateString('ja-JP')}まで閲覧できます。</p></article>:<output>共有を確認しています…</output>}<p className="meta">作成した方が自分で選んで共有した内容です。Checkや会話の全体は含みません。URLの転送は控えてください。</p><button className="secondary-button" onClick={onBack}>Camelliaを見てみる</button></main>;
}
