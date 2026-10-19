import { parseConversationReply } from './action-bridge.js';

type ProviderResponse = {
  text?: string;
  promptFeedback?: { blockReason?: unknown };
  candidates?: { finishReason?: unknown }[];
};
const blockedFinishes = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION', 'IMAGE_SAFETY']);

/** Validate inside the bounded model attempt, before marking the provider healthy. */
export function readProviderReply(response: ProviderResponse): string {
  const finish = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason || (typeof finish === 'string' && blockedFinishes.has(finish))) {
    throw Object.assign(new Error('GENERATION_BLOCKED'), { code: 'SAFETY_BLOCK' });
  }
  const text = response.text?.trim() || '';
  // Same parser as the handler; final action filtering still uses the actual message there.
  parseConversationReply(text, '');
  return text;
}
