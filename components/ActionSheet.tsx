/* oxlint-disable jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions,next/no-img-element,jsx-a11y/prefer-tag-over-role,jsx-a11y/no-noninteractive-element-interactions -- the sheet keeps its existing backdrop/scroll behaviour; it is a dialog by role, with Escape and Tab kept inside */
import { useEffect, useId, useRef, useState } from 'react';
import { TODAY_ONE_FLOW } from '@/lib/features';
import { IN_PLACE_STEPS } from '@/lib/today/flow';
import type { ActionDefinition,DismissReason,SaveTiming } from '@/types';

/* The primary button says what it does (TODAY_ONE_FLOW):
   - 「これにする」 chooses it for today (it waits in やってみていること until できた).
   - 「やってみる」 only for what can be done right here (IN_PLACE_STEPS): steps → できた / あとで / やめる.
   With the flag off, the sheet keeps its previous single 「やってみる」. Escape closes it and Tab stays inside. */
export function ActionSheet({action,onClose,onStart,onSave,onSkip,onDone}:{action:ActionDefinition;onClose:()=>void;onStart:()=>void;onSave:(t:SaveTiming)=>void;onSkip:(r:DismissReason)=>void;onDone?:()=>void}){
  const steps=TODAY_ONE_FLOW&&onDone?IN_PLACE_STEPS[action.id]:undefined;
  const[mode,setMode]=useState<'main'|'run'|'save'|'skip'>('main');
  const sheet=useRef<HTMLElement>(null);
  const titleId=useId();
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    sheet.current?.querySelector<HTMLElement>('.primary')?.focus({preventScroll:true});
    return()=>{if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  const onKeyDown=(e:React.KeyboardEvent)=>{
    if(e.key==='Escape'){e.stopPropagation();onClose();return;}
    if(e.key!=='Tab'||!sheet.current)return;
    const items=[...sheet.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select,textarea')];
    if(!items.length)return;
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  };
  return <div className="modal-backdrop" onClick={onClose}><section ref={sheet} className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown} onClick={e=>e.stopPropagation()}><button className="close" aria-label="閉じる" onClick={onClose}>×</button><img src={action.image} alt=""/><span className="eyebrow">{action.discoverCategory}</span><h2 id={titleId}>{action.title}</h2><p>{action.description}</p>
    {mode==='main'&&<>{steps?<button className="primary" onClick={()=>setMode('run')}>やってみる</button>:<button className="primary" onClick={onStart}>{TODAY_ONE_FLOW?'これにする':'やってみる'}</button>}{TODAY_ONE_FLOW&&!steps&&<p className="sheet-note">今日の「やってみていること」に入ります。終わったら「できた」を。</p>}<div className="sheet-actions"><button onClick={()=>setMode('save')}>あとで</button><button onClick={()=>setMode('skip')}>今日はやめる</button></div></>}
    {mode==='run'&&steps&&<div className="runner"><ol>{steps.map(step=><li key={step}>{step}</li>)}</ol><button className="primary" onClick={onDone}>できた</button><div className="sheet-actions"><button onClick={()=>onSave('later_today')}>あとで</button><button onClick={onClose}>やめる</button></div></div>}
    {mode==='save'&&<Choice title="いつのために保存しますか？" options={[['later_today','今日あとで'],['holiday','休日に'],['when_free','時間があるとき'],['save_only','保存だけ']]} onPick={x=>onSave(x as SaveTiming)}/>} {mode==='skip'&&<Choice title="よければ理由を教えてください" options={[['no_time','今日は時間がない'],['not_now','今日は気分じゃない'],['not_needed','今は必要ない'],['dislike','これは好きじゃない'],['other','その他']]} onPick={x=>onSkip(x as DismissReason)}/>}</section></div>}
function Choice({title,options,onPick}:{title:string;options:[string,string][];onPick:(v:string)=>void}){return <div className="choice-list"><h3>{title}</h3>{options.map(([v,l])=><button key={v} onClick={()=>onPick(v)}>{l}</button>)}</div>}
