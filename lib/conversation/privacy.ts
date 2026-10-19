/** Mask names already known from local profile/tree data before any Gemini request. */
export function redactKnownNames(value: string, knownNames: string[]) {
  return [...new Set(knownNames.map((name) => name.trim()).filter((name) => name.length >= 1))]
    .sort((a, b) => b.length - a.length)
    .reduce((text, name) => text.replaceAll(name, '[名前]'), value);
}

/** Never re-export local replies: they may have quoted private records. */
export function geminiHistory(messages: Array<{ role: 'user' | 'assistant' | 'system'; text: string; provider?: string }>) {
  const chat = messages.filter(message=>message.role!=='system');
  return chat.flatMap((message, index) => message.role === 'assistant' && message.provider === 'gemini' && chat[index - 1]?.role === 'user' ? [chat[index - 1], message] : []).slice(-8).map(({ role, text }) => ({ role: role==='assistant'?'assistant' as const:'user' as const, text }));
}
