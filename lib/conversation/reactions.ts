/* YURA / Lactone put a small reaction on the person's message the moment it arrives, then think and reply, the way
   a person nods before speaking. Only these five, and every message gets one (as in companion apps). It is chosen
   on the device from her words, so it never waits for the model and costs nothing: a painful message always gets 😭
   (feeling it with her), never a bright one; otherwise 👏 / 😀 / 👍 when the words say so, and 💓 (taken in) by default. */
export const CONVERSATION_REACTIONS = ['heart', 'smile', 'clap', 'thumbs', 'cry'] as const;
export type ConversationReaction = (typeof CONVERSATION_REACTIONS)[number];
export const REACTION_EMOJI: Record<ConversationReaction, string> = { heart: '💓', smile: '😀', clap: '👏', thumbs: '👍', cry: '😭' };
export const REACTION_LABEL: Record<ConversationReaction, string> = { heart: '気持ちを受け止めました', smile: 'うれしい', clap: 'がんばったね', thumbs: 'いいね', cry: 'つらかったね' };
/** After she sends, her message lands first; then the reaction pops on it. */
export const REACTION_DELAY_MS = 350;
/** How long the reaction shows on its own before メリィ starts thinking (the typing dots) or the reply appears. */
export const REACTION_LEAD_MS = 1100;
/** How long メリィ holds the same pose (and the emoji beside her): through the start of her thinking, not just a blink. */
export const REACTION_POSE_MS = 3500;
/** How long she shows that pose again after the reply. */
export const REACTION_AFTER_REPLY_MS = 5000;
export const isConversationReaction = (value: unknown): value is ConversationReaction =>
  typeof value === 'string' && (CONVERSATION_REACTIONS as readonly string[]).includes(value);

const PAINFUL = /(つらい|辛い|しんどい|苦しい|悲しい|かなしい|泣い|泣き|亡くな|死|病気|病院|入院|痛い|痛む|不安|こわい|怖い|寂しい|さみしい|孤独|別れ|離婚|失恋|いじめ|ハラスメント|虐待|暴力|傷つ|消えたい|眠れない|落ち込|最悪|ひどい|無理|限界)/;
const DID_IT = /(できた|出来た|やりき|やり切|やりとげ|やり遂げ|がんばっ|頑張っ|終わっ|おわっ|終えた|乗り切|のりき|合格|受かっ|達成|完成|完走|クリア|間に合っ|疲れ|つかれ|おつかれ|お疲れ)/;
const GLAD = /(うれしい|嬉しい|うれしかった|嬉しかった|楽しい|たのしい|楽しかった|たのしかった|最高|よかった|良かった|ワクワク|わくわく|幸せ|しあわせ|好き|おいしい|美味しい|笑)/;
const PLAN = /(てみよう|てみる|てみたい|てみます|しようと|しようかな|するつもり|決めた|きめた|挑戦|始め|はじめ|予定|いいね|なるほど|了解|りょうかい|わかった|OK|ok)/;
/** The reaction shown on her message, decided at once from what she wrote. */
export function reactionFor(message: string): ConversationReaction {
  const text = message.normalize('NFKC');
  if (PAINFUL.test(text)) return 'cry';
  if (DID_IT.test(text)) return 'clap';
  if (GLAD.test(text)) return 'smile';
  if (PLAN.test(text)) return 'thumbs';
  return 'heart';
}
