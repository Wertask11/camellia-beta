import { IDS, CONVERSATION_ACTIONS } from './action-catalog.js';
import { CONVERSATION_REACTIONS, safeReaction } from './reactions.js';
export const ACTION_BRIDGE_INSTRUCTION = `
ユーザーが具体的な選択肢を求めたときや、小さな行動が自然に役立つときだけ、次の候補からactionIdを一つ選べます。話を聞いてほしいだけのとき、質問で会話を続けているとき、医療・安全の相談ではactionIdはnull。毎回提案せず、文章だけで完結しても構いません。行動や回答を押しつけず、他の行動を創作しないでください。
候補: ${CONVERSATION_ACTIONS.map((action) => `${action.id}: ${action.title}`).join(' / ')}
ユーザーのメッセージには、返答の前に小さなリアクションを一つ付けます。heart（気持ちを受け止める・寄り添う）、smile（うれしい話・楽しい話）、clap（がんばったこと・できたこと）、thumbs（いい考え・了解）から選び、合うものがなければnone。つらい話・悲しい話・体調や安全の話にはheartかnoneだけを使ってください。
返答はJSON {"reaction":"heart/smile/clap/thumbs/noneのどれか","reply":"自然な日本語の返答","actionId":nullまたは候補ID} としてください。箇条書きを連発せず、ユーザーの直前の具体的な言葉を受け取り、同じ二択を繰り返さないでください。`;
export const CONVERSATION_RESPONSE_SCHEMA = {
  type: 'object',
  // reaction comes first so it can be shown before the reply streams in.
  properties: {
    reaction: { type: 'string', enum: [...CONVERSATION_REACTIONS, 'none'] },
    reply: { type: 'string' },
    actionId: { anyOf: [{ type: 'string', enum: IDS }, { type: 'null' }] },
  },
  required: ['reaction', 'reply', 'actionId'],
  additionalProperties: false,
};
export function parseConversationReply(raw: string, message: string) {
  let reply = raw.trim(),
    actionId: unknown,
    reaction: unknown;
  if (reply.startsWith('{')) {
    try {
      const parsed = JSON.parse(reply);
      if (typeof parsed.reply !== 'string') throw new Error();
      reply = parsed.reply.trim();
      actionId = parsed.actionId;
      reaction = parsed.reaction;
    } catch {
      throw Object.assign(new Error('INVALID_GENERATION'), {
        code: 'INVALID_RESPONSE',
      });
    }
  }
  if (!reply)
    throw Object.assign(new Error('EMPTY_GENERATION'), {
      code: 'INVALID_RESPONSE',
    });
  // Explicit listening-only or medical conversations never carry a catalog suggestion.
  const noAction =
    /聞いて(ほしい|欲しい)|アドバイス(は|が)?(いらない|不要)|提案(は|が)?(いらない|不要)|診断|病気|うつ病|薬|自傷|暴力|死にたい|listen only|no advice/i.test(
      message,
    );
  const action =
    !noAction && CONVERSATION_ACTIONS.find((action) => action.id === actionId);
  const shown = safeReaction(reaction, message);
  return {
    reply: Array.from(reply).slice(0, 300).join(''),
    ...(action ? { actionId: action.id } : {}),
    ...(shown ? { reaction: shown } : {}),
  };
}
