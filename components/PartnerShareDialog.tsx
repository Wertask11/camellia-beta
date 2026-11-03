'use client';
import {useEffect,useRef,useState} from 'react';
import {ACTIONS} from '@/data/actions';
import {FEELING_MESSAGES,type ShareKind} from '@/lib/partner/model';
import {partnerUrl,shareRequest,type OwnShare} from '@/lib/partner/client';
import {requestMembership} from '@/lib/membership/client';
import {membershipFromRecord,type Membership} from '@/lib/membership/model';
import type {AnalyticsEventName} from '@/types';
import {PlusOffer} from './PlusOffer';
export type ShareDraft={kind:ShareKind;actionId?:string;placeSlug?:string;placeTitle?:string;demo?:boolean};
export function PartnerShareDialog({draft,onClose,onTrack,previewOnly=true}:{draft:ShareDraft;previewOnly?:boolean;onClose:()=>void;onTrack:(name:AnalyticsEventName,props?:Record<string,string|number|boolean>)=>void}){
 const ref=useRef<HTMLDialogElement>(null),sent=useRef(false),lock=useRef(false);
 const [plan,setPlan]=useState<Membership>(()=>membershipFromRecord(undefined)),[error,setError]=useState(''),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false),[recipient,setRecipient]=useState<'partner'|'trusted_person'|''>(''),[timing,setTiming]=useState<'today'|'someday'>('today'),[days,setDays]=useState<1|7>(1),[feeling,setFeeling]=useState<keyof typeof FEELING_MESSAGES>('listen'),[url,setUrl]=useState(''),[shares,setShares]=useState<OwnShare[]>([]),[offer,setOffer]=useState(false),[notice,setNotice]=useState('');
 const [asOf]=useState(()=>Date.now());
 const title=draft.kind==='feeling'?FEELING_MESSAGES[feeling]:draft.kind==='action'?ACTIONS.find(a=>a.id===draft.actionId)?.title??'':draft.placeTitle??'';
 const load=()=>{if(previewOnly)return;void requestMembership().then(setPlan).catch(e=>setError(e.message));void shareRequest({operation:'list'}).then(v=>setShares(v.shares)).catch(e=>setError(e.message));};
 useEffect(()=>{const previous=document.activeElement;const node=ref.current;node?.showModal();return()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
 useEffect(()=>{load();},[]); // oxlint-disable-line react-hooks/exhaustive-deps -- explicit load and retry only
 useEffect(()=>{if(!sent.current){sent.current=true;onTrack('partner_share_view',{share_kind:draft.kind});}},[draft.kind,onTrack]);
 const create=async()=>{
  if(lock.current||!consent||!recipient)return;
  lock.current=true;setBusy(true);setError('');
  try{const v=await shareRequest({operation:'create',kind:draft.kind,recipient,timing,days,consent:true,...(draft.kind==='feeling'?{feelingId:feeling}:draft.kind==='action'?{actionId:draft.actionId}:{placeSlug:draft.placeSlug})});setUrl(partnerUrl(v.token));setShares(old=>[{id:v.id,kind:draft.kind,title,createdAt:new Date().toISOString(),expiresAt:v.content.expiresAt,revoked:false},...old]);onTrack('partner_share_created',{share_kind:draft.kind});void requestMembership().then(setPlan).catch(()=>{});}
  catch(e){setError(e instanceof Error?e.message:'今は共有できません。');}finally{setBusy(false);lock.current=false;}
 };
 const send=async()=>{try{if(navigator.share){await navigator.share({title:'Camelliaから、伝えたいこと',url});setNotice('共有先の画面へ渡しました。');onTrack('partner_share_sent',{share_kind:draft.kind,share_result:'sent'});}else{await navigator.clipboard.writeText(url);setNotice('URLをコピーしました。送りたい相手とのトークへ貼り付けてください。');onTrack('partner_share_sent',{share_kind:draft.kind,share_result:'copied'});}}catch(e){if(e instanceof Error&&e.name==='AbortError'){setNotice('送信をキャンセルしました。作成したURLは下から取り消せます。');return;}setError('送れませんでした。表示されたURLを選択してコピーすることもできます。');}};
 const revoke=async(item:OwnShare)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await shareRequest({operation:'revoke',id:item.id});setShares(old=>old.map(s=>s.id===item.id?{...s,revoked:true}:s));setUrl('');onTrack('partner_share_revoked');}catch(e){setError(e instanceof Error?e.message:'取り消せませんでした。');}finally{setBusy(false);lock.current=false;}};
 return <><dialog ref={ref} className="commerce-dialog" aria-labelledby="partner-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><button disabled={busy} className="close" onClick={onClose} aria-label="閉じる">×</button><p className="eyebrow">本人が選んだ内容だけ</p><h2 id="partner-title">パートナーに伝える</h2>
 <p className="meta">現在はプレビューのみです。相手への送信・共有URLの作成は行いません。支払いも発生しません。</p>
 {error&&<p role="alert">{error}<button onClick={load}>もう一度確認する</button></p>}
 {draft.kind==='feeling'&&<label>伝えたい気持ち<select value={feeling} onChange={e=>setFeeling(e.target.value as keyof typeof FEELING_MESSAGES)}>{Object.entries(FEELING_MESSAGES).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>}
 <section className="share-preview" aria-label="共有される内容のプレビュー"><h3>{title}</h3><p>{draft.kind==='feeling'?'この一言を、自分が選んだ相手に伝えたい。':timing==='today'?'今日、こんな時間にしたい。':'今度、これを一緒にしてみたい。'}</p>{draft.demo&&<strong>デモ・掲載イメージです。実在店舗の紹介や予約ではありません。</strong>}<p className="meta">Checkの回答、会話履歴、名前、My Treeは含みません。</p></section>
 {!url?<><label>誰に伝えますか<select value={recipient} onChange={e=>setRecipient(e.target.value as typeof recipient)}><option value="">相手を選んでください</option><option value="partner">パートナー</option><option value="trusted_person">自分が信頼する相手</option></select></label><label>いつの希望ですか<select value={timing} onChange={e=>setTiming(e.target.value as typeof timing)}><option value="today">今日</option><option value="someday">今度</option></select></label><label>閲覧できる期間<select value={days} onChange={e=>setDays(Number(e.target.value) as 1|7)}><option value={1}>1日</option><option value={7}>7日</option></select></label>
 {plan?.sharingReady&&<label className="privacy-choice"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>この内容を、選んだ相手へ伝えます<small>URLを知っている人は期限内に閲覧できます。送り先は次の共有画面で自分で選び、転送にはご注意ください。</small></label>}
 {plan?.sharingReady&&plan.plan==='plus'?<button className="primary" disabled={busy||!consent||!recipient||!title} onClick={()=>void create()}>{busy?'確認しています…':'この内容で共有URLを作る'}</button>:<><button className="primary" disabled>共有の送信は準備中</button><button className="secondary-button" onClick={()=>setOffer(true)}>Camellia Plusを見る · 月500円</button></>}
 </>:<section><label>共有URL<input readOnly value={url} onFocus={e=>e.target.select()}/></label><p className="meta">このURLは作成時だけ表示されます。送りたい相手を確認してから送ってください。</p><button className="primary" onClick={()=>void send()}>送り先を選んで送る</button>{notice&&<output>{notice}</output>}</section>}
 {shares.length>0&&<section><h3>作成した共有</h3>{shares.map(item=><article key={item.id}><p>{item.title}</p><small>{item.revoked?'取り消し済み':Date.parse(item.expiresAt)<=asOf?'期限切れ':`${new Date(item.expiresAt).toLocaleDateString('ja-JP')}まで`}</small>{!item.revoked&&<button disabled={busy} className="text-button" onClick={()=>void revoke(item)}>この共有を取り消す</button>}</article>)}</section>}
 </dialog>{offer&&<PlusOffer source="partner" membership={plan} onClose={()=>setOffer(false)} onTrack={onTrack}/>}</>;
}
