/* YURA / Lactone put a small reaction on the person's message before the reply arrives, the way a person
   nods while listening. Only these four. The model chooses one (or none) in the same generation, so there is
   no extra request or cost. A bright reaction never lands on a painful message: there, only the heart. */
export const CONVERSATION_REACTIONS = ['heart', 'smile', 'clap', 'thumbs'] as const;
export type ConversationReaction = (typeof CONVERSATION_REACTIONS)[number];
export const REACTION_EMOJI: Record<ConversationReaction, string> = { heart: '💓', smile: '😀', clap: '👏', thumbs: '👍' };
export const REACTION_LABEL: Record<ConversationReaction, string> = { heart: '気持ちを受け止めました', smile: 'うれしい', clap: 'がんばったね', thumbs: 'いいね' };
export const isConversationReaction = (value: unknown): value is ConversationReaction =>
  typeof value === 'string' && (CONVERSATION_REACTIONS as readonly string[]).includes(value);

const PAINFUL = /(つらい|辛い|しんどい|苦しい|悲しい|かなしい|泣い|泣き|亡くな|死|病気|病院|入院|痛い|痛む|不安|こわい|怖い|寂しい|さみしい|孤独|別れ|離婚|失恋|いじめ|ハラスメント|虐待|暴力|傷つ|消えたい|眠れない|落ち込|最悪|ひどい|無理|限界)/;
/** The reaction actually shown. Anything outside the four, or "none", shows nothing. */
export function safeReaction(value: unknown, message: string): ConversationReaction | undefined {
  if (!isConversationReaction(value)) return undefined;
  if (value !== 'heart' && PAINFUL.test(message.normalize('NFKC'))) return 'heart';
  return value;
}
