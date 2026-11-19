'use client';
import {CAMELLIA_MESSAGE} from '@/lib/brand';
import {useEffect,useRef,useState} from 'react';
import {schoolParkAuth} from '@/lib/schoolpark/firebase';
import {billingRequest,checkout,billingRedirect,type BillingStatus} from '@/lib/billing/client';
import type {Membership} from '@/lib/membership/model';
import type {AnalyticsEventName} from '@/types';
export function PlusOffer({source,membership,onClose,onTrack}:{source:'place'|'partner'|'my';membership?:Membership|null;onClose:()=>void;onTrack:(name:AnalyticsEventName,props?:Record<string,string|number|boolean>)=>void}){
 const ref=useRef<HTMLDialogElement>(null),sent=useRef(false),requestId=useRef(''),owner=useRef(schoolParkAuth.currentUser?.uid);
 const [billing,setBilling]=useState<BillingStatus>(),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;const user=schoolParkAuth.currentUser;if(user&&!user.isAnonymous)void billingRequest('status').then(v=>{if(active&&v.priceYen===500)setBilling(v as BillingStatus);}).catch(()=>{});return()=>{active=false;};},[]);
 const start=async()=>{if(busy||!billing?.ready||!consent)return;if(schoolParkAuth.currentUser?.uid!==owner.current){setError('アカウントが変わりました。画面を開き直してください。');return;}setBusy(true);setError('');if(!requestId.current){requestId.current=billing.pendingRequestId??crypto.randomUUID();if(!billing.pendingRequestId)onTrack('plus_start',{source});}try{await checkout(billing,requestId.current);}catch(e){setError(e instanceof Error?e.message:'手続きを確認できませんでした。');}finally{setBusy(false);}};
 const manage=async()=>{if(busy)return;if(schoolParkAuth.currentUser?.uid!==owner.current){setError('アカウントが変わりました。画面を開き直してください。');return;}setBusy(true);setError('');try{const v=await billingRequest('portal');billingRedirect(v.url,'billing.stripe.com');}catch(e){setError(e instanceof Error?e.message:'手続きを確認できませんでした。');}finally{setBusy(false);}};
 useEffect(()=>{const previous=document.activeElement;const node=ref.current;node?.showModal();return()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
 useEffect(()=>{if(!sent.current){sent.current=true;onTrack('plus_offer_view',{source});}},[source,onTrack]);
 return <dialog ref={ref} className="commerce-dialog" aria-labelledby="plus-title" onCancel={e=>{e.preventDefault();onClose();}}><button className="close" onClick={onClose} aria-label="閉じる">×</button><p className="eyebrow">選択と行動を、もう少し自分らしく</p><h2 id="plus-title">Camellia Plus</h2><p className="plus-price">月額500円</p>
 <p className="meta">{CAMELLIA_MESSAGE}</p><section><h3>無料</h3><p>登録せずにToday・Check・今日の一枚・Camelliaの基本会話・Discover・Placeの基本提案と条件比較・Myを使えます。記録はこのブラウザへ保存します。Camellia IDでの引き継ぎも無料です。Circleへの参加には安全のためIDの確認が必要です。</p></section>
 <section><h3>Plusの中心は、あなたに合うパーソナル提案</h3><ul><li>本人が許可した希望を重ねたPlace提案・比較と、候補が合う理由の確認</li><li>気持ち・したいこと・行きたい場所のパートナー共有（現在は内容のプレビューのみ）</li><li>参加店舗が任意で提供する特典（未提供の特典は表示しません）</li></ul></section>
 {membership?.plan==='plus'?<output>{membership.trial?'Plus無料試用中です。自動課金はありません。':'Plusをご利用中です。'}</output>:<p className="meta">{billing?.ready?'月額500円で毎月自動更新します。解約はMyから手続きでき、支払い済みの期限まで利用できます。無料体験からの自動加入はありません。':'無料でも基本の提案はそのまま利用できます。支払いの受け付けは準備中です。いま料金は発生せず、この画面から有料加入することもありません。既存の無料機能はそのまま使えます。'}</p>}
 <p className="meta">会話は無料でもYURA・Lactoneの両方を使えます。Plusの会話拡張は準備中で、未提供の機能を利用できるとは案内しません。実店舗の掲載・特典は準備状況によって異なります。</p>{error&&<p role="alert">{error}</p>}
 {billing?.ready&&membership?.plan!=='plus'?<><p><a href={billing.termsUrl} target="_blank" rel="noopener noreferrer">利用規約</a>・<a href={billing.disclosureUrl} target="_blank" rel="noopener noreferrer">料金・解約・返金と販売者情報</a></p><label className="privacy-choice"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>月額500円の自動更新と解約条件を確認しました</label><button className="primary" disabled={busy||!consent} onClick={()=>void start()}>{busy?'手続きを確認しています…':'月額500円の支払い手続きへ'}</button></>:!billing?.customer&&<button className="primary" disabled>支払い受付は準備中</button>}
 {billing?.customer&&<button className="secondary-button" disabled={busy} onClick={()=>void manage()}>支払い履歴・解約を確認する</button>}<button className="secondary-button" onClick={onClose}>いま使える機能に戻る</button>
 </dialog>;
}
