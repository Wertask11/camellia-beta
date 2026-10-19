import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { CONVERSATION_MODELS } from '@/lib/conversation/models';
import type { ConversationModelId } from '@/types';

function ModelDialog({id,value,onSelect,onClose}:{id:string;value:ConversationModelId;onSelect:(id:ConversationModelId)=>void;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null), title=useId();
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const dialog=ref.current;dialog?.showModal();
    dialog?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    return()=>{dialog?.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  return <dialog ref={ref} id={id} className="conversation-model-dialog" aria-modal="true" aria-labelledby={title}
    onCancel={event=>{event.preventDefault();onClose();}}
    onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const buttons=[...ref.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')??[]];
      if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1)?.focus();}
      else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0]?.focus();}
    }}>
    <header><h2 id={title}>話し方を選ぶ</h2><button type="button" className="model-dialog-close" onClick={onClose} aria-label="閉じる"><X size={20}/></button></header>
    <p className="model-selector-copy">Camelliaには、2つの話し方があります。</p>
    <div role="menu" tabIndex={-1} aria-label="Camelliaのモデル" onKeyDown={event=>{
      if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
      event.preventDefault();const options=[...ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')??[]];
      const index=options.findIndex(option=>option===document.activeElement);
      const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
      options[next]?.focus();
    }}>
      {CONVERSATION_MODELS.map(model=><button key={model.id} type="button" role="menuitemradio" aria-checked={value===model.id} className="conversation-model-option" onClick={()=>{onSelect(model.id);onClose();}}>
        <span className="model-option-heading"><strong>{model.name}</strong><span>{model.summary}</span>{value===model.id&&<Check size={20} aria-hidden="true"/>}</span>
        <span className="model-option-concept">{model.concept}</span><span className="model-option-description">{model.description}</span>
      </button>)}
    </div>
  </dialog>;
}

export function ConversationModelSelector({value,onSelect,disabled=false}:{value:ConversationModelId;onSelect:(id:ConversationModelId)=>void;disabled?:boolean}) {
  const [open,setOpen]=useState(false);const id=useId();
  const model=CONVERSATION_MODELS.find(item=>item.id===value)!;
  return <div className="conversation-model-control"><button type="button" className="model-selector-trigger" disabled={disabled} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label={`話し方を選ぶ（現在：${model.name}）`}>
    <strong>{model.name}</strong><span>{model.summary}</span><ChevronDown size={16}/>
  </button>{open&&<ModelDialog id={id} value={value} onSelect={onSelect} onClose={()=>setOpen(false)}/>}</div>;
}
