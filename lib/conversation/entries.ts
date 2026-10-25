import type { AIMessage, ConversationModelId } from '@/types';
import { isConversationModel } from './models';
import { isConversationReaction } from './reactions';

export function isModelSwitchMessage(message: AIMessage): message is AIMessage & { role: 'system'; type: 'system_model_switch'; from: ConversationModelId; to: ConversationModelId } {
  return message.role === 'system' && message.type === 'system_model_switch' && isConversationModel(message.from) && isConversationModel(message.to);
}

/** Shared by local recovery and cloud restore. Legacy chat records keep their original shape. */
export function validConversationEntry(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.text !== 'string' || typeof row.createdAt !== 'string' || !Number.isFinite(Date.parse(row.createdAt))) return false;
  if (row.role === 'system') return row.type === 'system_model_switch' && row.text === '' && isConversationModel(row.from) && isConversationModel(row.to) && row.from !== row.to;
  if(row.pending!==undefined&&(typeof row.pending!=='boolean'||row.role!=='user'))return false;
  if(row.requestModel!==undefined&&!isConversationModel(row.requestModel))return false;
  if(row.reaction!==undefined&&(row.role!=='user'||!isConversationReaction(row.reaction)))return false;
  return (row.role === 'user' || row.role === 'assistant') && row.type !== 'system_model_switch'
    && (row.assistantModel === undefined || row.assistantModel === null || typeof row.assistantModel === 'string');
}
