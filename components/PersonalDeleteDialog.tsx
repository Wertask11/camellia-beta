import { useEffect, useId, useRef, type ReactNode } from 'react';

export function PersonalDeleteDialog({busy,onCancel,onConfirm,children}:{busy:boolean;onCancel:()=>void;onConfirm:()=>void;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  const cancel=useRef<HTMLButtonElement>(null);
  const title=useId();const description=useId();
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const dialog=ref.current;
    // Native modal dialogs make the background inert and stay above all app layers.
    dialog?.showModal();cancel.current?.focus();
    return()=>{dialog?.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  return <dialog ref={ref} className="sheet compact personal-delete-dialog" aria-modal="true" aria-labelledby={title} aria-describedby={description}
    onCancel={event=>{event.preventDefault();if(!busy)onCancel();}}
    onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const items=[...ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')??[]];
      if(!items.length){event.preventDefault();ref.current?.focus();return;}
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }}>
    <h2 id={title}>保存データを削除しますか？</h2>
    <div id={description}>{children}</div>
    <div className="sheet-actions"><button ref={cancel} disabled={busy} onClick={onCancel}>キャンセル</button><button className="danger-button" disabled={busy} onClick={onConfirm}>{busy?'削除しています…':'削除する'}</button></div>
  </dialog>;
}
