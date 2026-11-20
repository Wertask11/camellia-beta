/** No business defaults. Approval is required for new paid contracts; old grants are unchanged. */
export type ConversationPolicy = {
  version: string;
  dailyLimit: number;
  historyMessages: number;
  historyChars: number;
  approvedBy: string;
  approvedAt: string;
};
export type HistoryLimits = Pick<
  ConversationPolicy,
  'historyMessages' | 'historyChars'
>;
export type ConversationRateDecision =
  | boolean
  | { allowed: true; historyLimits: HistoryLimits };
export function conversationPolicyFromResponse(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const v = value as Record<string, unknown>;
  if (
    typeof v.version !== 'string' ||
    !/^[-a-zA-Z0-9_]{1,80}$/.test(v.version) ||
    !Number.isSafeInteger(v.dailyLimit) ||
    Number(v.dailyLimit) < 30 ||
    Number(v.dailyLimit) > 100000 ||
    !Number.isSafeInteger(v.historyMessages) ||
    Number(v.historyMessages) < 0 ||
    Number(v.historyMessages) > 8 ||
    !Number.isSafeInteger(v.historyChars) ||
    Number(v.historyChars) < 1 ||
    Number(v.historyChars) > 500
  )
    return;
  return {
    version: v.version,
    dailyLimit: Number(v.dailyLimit),
    historyMessages: Number(v.historyMessages),
    historyChars: Number(v.historyChars),
  };
}
export function approvedConversationPolicy(
  value: unknown,
  now = Date.now(),
): ConversationPolicy | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const v = value as Record<string, unknown>;
  // Technical validation bounds, not default allowances. Never reduce the guaranteed Free base.
  if (
    v.approved !== true ||
    typeof v.version !== 'string' ||
    !/^[-a-zA-Z0-9_]{1,80}$/.test(v.version) ||
    typeof v.approvedBy !== 'string' ||
    !v.approvedBy ||
    typeof v.approvedAt !== 'string' ||
    !Number.isFinite(Date.parse(v.approvedAt)) ||
    Date.parse(v.approvedAt) > now ||
    !Number.isSafeInteger(v.dailyLimit) ||
    Number(v.dailyLimit) < 30 ||
    Number(v.dailyLimit) > 100000 ||
    !Number.isSafeInteger(v.historyMessages) ||
    Number(v.historyMessages) < 0 ||
    Number(v.historyMessages) > 8 ||
    !Number.isSafeInteger(v.historyChars) ||
    Number(v.historyChars) < 1 ||
    Number(v.historyChars) > 500
  )
    return;
  return {
    version: v.version,
    dailyLimit: Number(v.dailyLimit),
    historyMessages: Number(v.historyMessages),
    historyChars: Number(v.historyChars),
    approvedBy: v.approvedBy,
    approvedAt: v.approvedAt,
  };
}
export function publicConversationPolicy(policy: ConversationPolicy) {
  return {
    version: policy.version,
    dailyLimit: policy.dailyLimit,
    historyMessages: policy.historyMessages,
    historyChars: policy.historyChars,
  };
}
export function storedConversationPolicy(value: unknown, now = Date.now()) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? approvedConversationPolicy({ ...value, approved: true }, now)
    : undefined;
}
