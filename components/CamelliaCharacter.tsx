/* oxlint-disable next/no-img-element -- small local SVGs from public/character; an image proxy adds nothing */
import type { ConversationModelId } from '@/types';
import type { ConversationReaction } from '@/lib/conversation/reactions';

/* Camellia's character (default name メリィ). One character, two forms: YURA (pink, leaning, petals) and
   Lactone (beige, upright, notebook). Final art from the design handoff: public/character/{full,icon}/.
   48px and smaller always use the icon art (face only); the full body is for 200px and up. */
export type CharacterExpression = 'listen' | 'receive' | 'happy' | 'praise' | 'like' | 'think' | 'cry';
export const DEFAULT_CHARACTER_NAME = 'メリィ';
// Each reaction has the same pose: 💓 holds a heart, 😀 smiles, 👏 claps, 👍 thumbs up, 😭 cries with her.
export const EXPRESSION_FOR_REACTION: Record<ConversationReaction, CharacterExpression> = { heart: 'receive', smile: 'happy', clap: 'praise', thumbs: 'like', cry: 'cry' };
export const characterName = (name: string | null | undefined) => name?.trim() || DEFAULT_CHARACTER_NAME;

export const CHARACTER_NAME_MAX = 12;
/** Characters as people count them: an emoji or a combined letter counts once. */
export function characterNameLength(value: string) {
  const trimmed = value.trim();
  return typeof Intl !== 'undefined' && 'Segmenter' in Intl ? [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(trimmed)].length : Array.from(trimmed).length;
}
/** What is saved: null for the default name (empty), the trimmed name when it is 1–12 characters, undefined when too long. */
export function cleanCharacterName(value: string): string | null | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed === DEFAULT_CHARACTER_NAME) return null;
  return characterNameLength(trimmed) <= CHARACTER_NAME_MAX ? trimmed : undefined;
}
/** How the two forms are introduced: 「メリィ · YURA」. YURA / Lactone are fixed form names. */
export const characterLabel = (name: string | null | undefined, form: ConversationModelId) => `${characterName(name)} · ${form === 'yura' ? 'YURA' : 'Lactone'}`;

export function CamelliaCharacter({ form, expression = 'listen', size, label, className }: { form: ConversationModelId; expression?: CharacterExpression; size: number; label?: string; className?: string }) {
  const variant = size <= 48 ? 'icon' : 'full';
  return <img className={['camellia-character', `camellia-character--${form}`, className].filter(Boolean).join(' ')} src={`/character/${variant}/${form}-${expression}.svg`} width={size} height={size} alt={label ?? ''} aria-hidden={label ? undefined : true} draggable={false} decoding="async" />;
}
