'use client';
import { useState } from 'react';
import { CamelliaCharacter, CHARACTER_NAME_MAX, DEFAULT_CHARACTER_NAME, characterName, characterNameLength, cleanCharacterName } from '@/components/CamelliaCharacter';

/* She can name Camellia's character. YURA and Lactone stay as the names of its two forms. */
export function CharacterNameSetting({ value, onSave }: { value: string | null | undefined; onSave: (name: string | null) => void }) {
  const [draft, setDraft] = useState(value ?? '');
  const [saved, setSaved] = useState(false);
  const length = characterNameLength(draft);
  const cleaned = cleanCharacterName(draft);
  const save = (next: string | null) => { onSave(next); setDraft(next ?? ''); setSaved(true); };
  return <details className="my-character">
    <summary>Camelliaのキャラクター</summary>
    <section className="panel character-name-setting">
      <div className="character-name-preview">
        <CamelliaCharacter form="yura" size={64} label={`${characterName(value)} · YURA`} />
        <CamelliaCharacter form="lactone" size={64} label={`${characterName(value)} · Lactone`} />
      </div>
      <form onSubmit={e => { e.preventDefault(); if (cleaned !== undefined) save(cleaned); }}>
        <label>この子の名前<input value={draft} placeholder={DEFAULT_CHARACTER_NAME} onChange={e => { setDraft(e.target.value); setSaved(false); }} autoComplete="off" /></label>
        <p className="meta">1〜{CHARACTER_NAME_MAX}文字。空欄なら「{DEFAULT_CHARACTER_NAME}」に戻ります　<span aria-live="polite">{length}/{CHARACTER_NAME_MAX}</span></p>
        {cleaned === undefined && <p className="auth-error" role="alert">{CHARACTER_NAME_MAX}文字までにしてください。</p>}
        <button className="primary" type="submit" disabled={cleaned === undefined}>名前を保存する</button>
        <button className="secondary-button" type="button" onClick={() => save(null)}>初期名に戻す</button>
      </form>
      {saved && <output className="meta">「{characterName(cleaned ?? null)}」になりました。会話では「{characterName(cleaned ?? null)} · YURA」「{characterName(cleaned ?? null)} · Lactone」と出ます。</output>}
    </section>
  </details>;
}
