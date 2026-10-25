/* YURA / Lactone put a small reaction on the person's message before the reply arrives, the way a person
   nods while listening. Only these five, and every message gets one (as in companion apps). The model chooses it
   in the same generation, so there is no extra request or cost; if it does not, 💓 (taken in). A painful message always gets 😭 (feeling it with her), never a bright one. */
export const CONVERSATION_REACTIONS = ['heart', 'smile', 'clap', 'thumbs', 'cry'] as const;
export type ConversationReaction = (typeof CONVERSATION_REACTIONS)[number];
export const REACTION_EMOJI: Record<ConversationReaction, string> = { heart: '💓', smile: '😀', clap: '👏', thumbs: '👍', cry: '😭' };
export const REACTION_LABEL: Record<ConversationReaction, string> = { heart: '気持ちを受け止めました', smile: 'うれしい', clap: 'がんばったね', thumbs: 'いいね', cry: 'つらかったね' };
/** How long the reaction shows on its own before the reply text appears. */
export const REACTION_LEAD_MS = 900;
export const isConversationReaction = (value: unknown): value is ConversationReaction =>
  typeof value === 'string' && (CONVERSATION_REACTIONS as readonly string[]).includes(value);

const PAINFUL = /(つらい|辛い|しんどい|苦しい|悲しい|かなしい|泣い|泣き|亡くな|死|病気|病院|入院|痛い|痛む|不安|こわい|怖い|寂しい|さみしい|孤独|別れ|離婚|失恋|いじめ|ハラスメント|虐待|暴力|傷つ|消えたい|眠れない|落ち込|最悪|ひどい|無理|限界)/;
/** The reaction actually shown: 😭 on a painful message, otherwise the model's choice, or 💓 when it gave none. */
export function safeReaction(value: unknown, message: string): ConversationReaction {
  if (PAINFUL.test(message.normalize('NFKC'))) return 'cry';
  return isConversationReaction(value) ? value : 'heart';
}
