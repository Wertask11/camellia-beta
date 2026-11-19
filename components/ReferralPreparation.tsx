'use client';
import {useState} from 'react';
import {referralStatus,issueReferral} from '@/lib/referral/request';
export function ReferralPreparation() {
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[url,setUrl]=useState(''),[notice,setNotice]=useState('');
 const check=()=>{void referralStatus().then(setReady).catch(()=>setReady(false));};
 const issue=async()=>{if(busy)return;setBusy(true);setNotice('');try{setUrl(await issueReferral());}catch(e){setNotice(e instanceof Error?e.message:'紹介リンクを確認できませんでした。');}finally{setBusy(false);}};
 const send=async()=>{try{const native=typeof navigator.share==='function';if(native)await navigator.share({title:'Camelliaで、自分のための選択を',url});else await navigator.clipboard.writeText(url);setNotice(native?'共有先の画面へ渡しました。':'リンクをコピーしました。送りたい相手へ貼り付けてください。');}catch{setNotice('送信を完了していません。リンクは選択してコピーできます。');}};
 return <details className="my-feature-preferences" onToggle={e=>{if(e.currentTarget.open)check();}}><summary>{ready?'紹介とPlus体験':'紹介とPlus体験（準備中）'}</summary><section className="panel"><h2>好きな体験を、誰かに伝える</h2><p>{ready?'紹介から新しくCamellia IDを取得した方に、Plusを7日間体験できる特典があります。':'紹介制度はまだ始まっていません。開始後は、新しくCamellia IDを取得した方にPlusの7日間体験を予定しています。'}紹介した方はJST暦月3件までMy Treeの装飾を選べます。紹介自体の回数に上限はありません。</p><p className="meta">体験終了後の自動課金はありません。取得した装飾は永久保有で、無料・Plusのどちらでも使えます。自己紹介・重複登録は特典の対象外です。予算・体験のAI枠・期間・特典条件の確認が整ってから開始します。紹介数のランキングや木の成長点は作りません。</p>
 {ready&&<><button className="secondary-button" disabled={busy} onClick={()=>void issue()}>{busy?'確認しています…':'紹介リンクを作る'}</button>{url&&<><label>紹介リンク<input readOnly value={url} onFocus={e=>e.target.select()}/></label><p className="meta">あなたのCheckや会話・名前は含みません。送り先は自分で選んでください。</p><button className="secondary-button" onClick={()=>void send()}>送り先を選ぶ・コピーする</button></>}</>}{notice&&<output>{notice}</output>}</section></details>;
}
