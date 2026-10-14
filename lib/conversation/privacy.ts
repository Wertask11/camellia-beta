/** Mask names already known from local profile/tree data before any Gemini request. */
export function redactKnownNames(value: string, knownNames: string[]) {
  return [...new Set(knownNames.map((name) => name.trim()).filter((name) => name.length >= 2))]
    .sort((a, b) => b.length - a.length)
    .reduce((text, name) => text.replaceAll(name, '[名前]'), value);
}
