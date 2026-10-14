/** Mask names already known from local profile/tree data before any Gemini request. */
export function redactKnownNames(value: string, knownNames: string[]) {
  return [...new Set(knownNames.map((name) => name.trim()).filter((name) => name.length >= 1))]
    .sort((a, b) => b.length - a.length)
    .reduce((text, name) => text.replaceAll(name, '[名前]'), value);
}

/** Never re-export local replies: they may have quoted private records. */
export function geminiHistory(messages: Array<{ role: 'user' | 'assistant'; text: string; provider?: string }>) {
  return messages.flatMap((message, index) => message.role === 'assistant' && message.provider === 'gemini' && messages[index - 1]?.role === 'user' ? [messages[index - 1], message] : []).slice(-8).map(({ role, text }) => ({ role, text }));
}
