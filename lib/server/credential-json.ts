/** Decode text transport only. Never evaluate code, read files or change identity fields. */
function quoteControlCharacters(source: string) {
  let quoted = false, escaped = false, output = '';
  for (const character of source) {
    if (quoted && !escaped && character.charCodeAt(0) < 32) {
      output += JSON.stringify(character).slice(1, -1);
      continue;
    }
    if (character === '"' && !escaped) quoted = !quoted;
    output += character;
    escaped = character === '\\' && !escaped;
  }
  return output;
}

export function parseServiceAccountJson(raw: string): Record<string, unknown> {
  let source = raw.trim();
  if (source.length > 65536) throw new SyntaxError('INVALID_SERVICE_ACCOUNT_JSON');
  if (source.startsWith('FIREBASE_SERVICE_ACCOUNT_JSON='))
    source = source.slice('FIREBASE_SERVICE_ACCOUNT_JSON='.length).trim();
  const fence = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(source);
  if (fence) source = fence[1].trim();
  if (source.startsWith("'") && source.endsWith("'"))
    source = source.slice(1, -1).trim();
  for (let layer = 0; layer < 2; layer++) {
    let value: unknown;
    try {
      value = JSON.parse(source);
    } catch {
      try {
        value = JSON.parse(quoteControlCharacters(source));
      } catch {
        // JSON parser messages may quote the credential. Do not propagate them.
        throw new SyntaxError('INVALID_SERVICE_ACCOUNT_JSON');
      }
    }
    if (typeof value === 'string') {
      source = value.trim();
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    throw new SyntaxError('INVALID_SERVICE_ACCOUNT_JSON');
  }
  throw new SyntaxError('INVALID_SERVICE_ACCOUNT_JSON');
}

/** Fixed labels only; never expose credential text, filenames, sizes or identities. */
export function credentialInputFormat(raw: string | undefined) {
  const source = raw?.trim() ?? '';
  if (!source) return 'empty';
  if (source.startsWith('FIREBASE_SERVICE_ACCOUNT_JSON=')) return 'env_assignment';
  if (source.startsWith('```')) return 'code_block';
  if (source.startsWith('{')) return 'object_like';
  if (source.startsWith('"') || source.startsWith("'")) return 'quoted_text';
  if (source.startsWith('-----BEGIN')) return 'private_key_only';
  if (/^[^\r\n{}]{1,260}\.json$/i.test(source)) return 'file_name';
  return 'other_text';
}
