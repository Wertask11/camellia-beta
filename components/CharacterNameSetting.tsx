'use client';
import { useState } from 'react';
import { CamelliaCharacter, characterName } from '@/components/CamelliaCharacter';
import { CharacterNameEditor } from '@/components/CharacterNameEditor';

/* She can name Camellia's character. YURA and Lactone stay as the names of its two forms. */
export function CharacterNameSetting({ value, onSave }: { value: string | null | undefined; onSave: (name: string | null) => void }) {
  const [saved, setSaved] = useState<string | null | undefined>();
  const [round, setRound] = useState(0);
  return <details className="my-character">
    <summary>Camelliaのキャラクター</summary>
    <section className="panel character-name-setting">
      <div className="character-name-preview">
        <CamelliaCharacter form="yura" size={64} label={`${characterName(value)} · YURA`} />
        <CamelliaCharacter form="lactone" size={64} label={`${characterName(value)} · Lactone`} />
      </div>
      <CharacterNameEditor key={round} value={value} onSave={name => { onSave(name); setSaved(name); setRound(n => n + 1); }} />
      {saved !== undefined && <output className="meta">「{characterName(saved)}」になりました。会話では「{characterName(saved)} · YURA」「{characterName(saved)} · Lactone」と出ます。</output>}
    </section>
  </details>;
}
