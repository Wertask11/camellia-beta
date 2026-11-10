'use client';
import {useEffect,useRef} from 'react';
import {conditionFacts} from '@/lib/place/conditions';
import type {Place} from '@/lib/place/model';
export function PlaceComparison({places,enhanced,onClose}:{places:Place[];enhanced:boolean;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const previous=document.activeElement,node=ref.current;node?.showModal();return()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
 return <dialog className="commerce-dialog" ref={ref} aria-labelledby="place-comparison-title" onCancel={e=>{e.preventDefault();onClose();}}><button className="close" onClick={onClose} aria-label="閉じる">×</button><h2 id="place-comparison-title">候補を比べて、自分で選ぶ</h2><p className="meta">{enhanced?'本人が許可した希望を参考にした比較です。':'掲載されている事実から比較します。'}価格・営業・予約の最終条件は公式情報をご確認ください。</p>{places.map(p=><article className="panel" key={p.slug}><h3>{p.name}</h3><p>{p.experience||p.shortDescription}</p><ul>{conditionFacts(p).map(f=><li key={f}>{f}</li>)}</ul>{enhanced&&<p>登録された特徴：{p.tags.join('・')||'確認できる特徴がまだありません'}</p>}{p.status!=='published'&&<p className="meta">デモ・体験イメージ</p>}</article>)}</dialog>;
}
