'use client';
import { useState } from 'react';
import { CHARACTER_NAME_MAX, DEFAULT_CHARACTER_NAME, characterNameLength, cleanCharacterName } from '@/components/CamelliaCharacter';

/* Naming Camellia's character: 1–12 characters, empty goes back to メリィ. Used in My and on her profile. */
export function CharacterNameEditor({ value, onSave, onCancel, autoFocus }: { value: string | null | undefined; onSave: (name: string | null) => void; onCancel?: () => void; autoFocus?: boolean }) {
  const [draft, setDraft] = useState(value ?? '');
  const cleaned = cleanCharacterName(draft);
  return <form className="character-name-editor" onSubmit={e => { e.preventDefault(); if (cleaned !== undefined) onSave(cleaned); }}>
    {/* oxlint-disable-next-line jsx-a11y/no-autofocus -- opened on purpose from 「名前を編集」 */}
    <label>この子の名前<input value={draft} placeholder={DEFAULT_CHARACTER_NAME} onChange={e => setDraft(e.target.value)} autoComplete="off" autoFocus={autoFocus} /></label>
    <p className="meta">1〜{CHARACTER_NAME_MAX}文字。空欄なら「{DEFAULT_CHARACTER_NAME}」に戻ります　<span aria-live="polite">{characterNameLength(draft)}/{CHARACTER_NAME_MAX}</span></p>
    {cleaned === undefined && <p className="auth-error" role="alert">{CHARACTER_NAME_MAX}文字までにしてください。</p>}
    <button className="primary" type="submit" disabled={cleaned === undefined}>名前を保存する</button>
    <button className="secondary-button" type="button" onClick={() => onSave(null)}>初期名に戻す</button>
    {onCancel && <button className="text-button" type="button" onClick={onCancel}>やめる</button>}
  </form>;
}
