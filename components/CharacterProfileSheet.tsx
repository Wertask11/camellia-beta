'use client';
import { useEffect, useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { CamelliaCharacter, characterName } from '@/components/CamelliaCharacter';
import { CharacterNameEditor } from '@/components/CharacterNameEditor';
import { CONVERSATION_MODELS } from '@/lib/conversation/models';
import type { ConversationModelId } from '@/types';

/* Tapping the floating character opens her profile (as in companion apps): a big portrait, her name and how she is
   doing. The pencil opens 「名前を編集」 and 「姿を変える」 (YURA / Lactone). */
export function CharacterProfileSheet({ name, form, busy, canSwitch, onRename, onSwitch, onClose }: {
  name: string | null | undefined; form: ConversationModelId; busy: boolean; canSwitch: boolean;
  onRename: (name: string | null) => void; onSwitch: (form: ConversationModelId) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'view' | 'menu' | 'rename'>('view');
  useEffect(() => { const d = dialog.current; if (d && !d.open) d.showModal?.(); return () => { if (d?.open) d.close(); }; }, []);
  const model = CONVERSATION_MODELS.find(item => item.id === form)!;
  const other = CONVERSATION_MODELS.find(item => item.id !== form)!;
  return <dialog ref={dialog} className="character-profile" aria-labelledby="character-profile-name" onCancel={e => { e.preventDefault(); onClose(); }}>
    <button className="close" onClick={onClose} aria-label="閉じる"><X size={20} /></button>
    <div className={`character-profile-portrait character-profile-portrait--${form}`}>
      <CamelliaCharacter form={form} expression={busy ? 'think' : 'happy'} size={160} />
      <button className="character-profile-edit" onClick={() => setMode(mode === 'menu' ? 'view' : 'menu')} aria-label="キャラクターを編集" aria-expanded={mode === 'menu'}><Pencil size={15} /></button>
      {mode === 'menu' && <div className="character-profile-menu" role="menu">
        <button role="menuitem" onClick={() => setMode('rename')}>Aa　名前を編集</button>
        {canSwitch && <button role="menuitem" onClick={() => { onSwitch(other.id); setMode('view'); }}>✿　姿を変える（{other.name}）</button>}
      </div>}
    </div>
    <h2 id="character-profile-name">{characterName(name)}</h2>
    <p className="character-profile-status">{busy ? '考え中です' : 'そばにいます'}</p>
    <p className="character-profile-form"><b>{model.name}</b>　{model.concept}<br /><small>{model.description}</small></p>
    {mode === 'rename' && <CharacterNameEditor value={name} autoFocus onCancel={() => setMode('view')} onSave={next => { onRename(next); setMode('view'); }} />}
    <p className="meta">YURA と Lactone は、同じ{characterName(name)}の2つの姿です。名前は、あなたの Camellia の中だけで使われます。</p>
  </dialog>;
}
