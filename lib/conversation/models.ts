import type { ConversationModelId } from '@/types';

/** UX styles, not separate providers, price levels or access tiers. Prompts stay server-owned. */
export const CONVERSATION_MODELS = [
  { id: 'yura', name: 'YURA', summary: '気持ちをほどく', concept: '話して、ほどく。', description: 'うまく言葉にならない気持ちを、ゆっくり一緒に見つけます。' },
  { id: 'lactone', name: 'Lactone', summary: '考えを整える', concept: '整えて、選ぶ。', description: '状況や選択肢を整理して、今日の次の一歩を一緒に考えます。' },
] as const;

export function isConversationModel(value: unknown): value is ConversationModelId {
  return value === 'yura' || value === 'lactone';
}
export function defaultConversationModel(value?: unknown): ConversationModelId {
  return isConversationModel(value) ? value : 'yura';
}
/** Undefined legacy attribution remains Camellia; never infer a historical persona. */
export function conversationModelName(value?: unknown): string {
  return CONVERSATION_MODELS.find(model => model.id === value)?.name ?? 'Camellia';
}
