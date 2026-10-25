import { IDS, CONVERSATION_ACTIONS } from './action-catalog.js';
export const ACTION_BRIDGE_INSTRUCTION = `
ユーザーが具体的な選択肢を求めたときや、小さな行動が自然に役立つときだけ、次の候補からactionIdを一つ選べます。話を聞いてほしいだけのとき、質問で会話を続けているとき、医療・安全の相談ではactionIdはnull。毎回提案せず、文章だけで完結しても構いません。行動や回答を押しつけず、他の行動を創作しないでください。
候補: ${CONVERSATION_ACTIONS.map((action) => `${action.id}: ${action.title}`).join(' / ')}
返答はJSON {"reply":"自然な日本語の返答","actionId":nullまたは候補ID} としてください。箇条書きを連発せず、ユーザーの直前の具体的な言葉を受け取り、同じ二択を繰り返さないでください。`;
export const CONVERSATION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    actionId: { anyOf: [{ type: 'string', enum: IDS }, { type: 'null' }] },
  },
  required: ['reply', 'actionId'],
  additionalProperties: false,
};
export function parseConversationReply(raw: string, message: string) {
  let reply = raw.trim(),
    actionId: unknown;
  if (reply.startsWith('{')) {
    try {
      const parsed = JSON.parse(reply);
      if (typeof parsed.reply !== 'string') throw new Error();
      reply = parsed.reply.trim();
      actionId = parsed.actionId;
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
  return {
    reply: Array.from(reply).slice(0, 300).join(''),
    ...(action ? { actionId: action.id } : {}),
  };
}
