import { serializeConversationState } from '@/lib/conversation/persistence';
import type { CamelliaState } from '@/types';
import { validateStoredState } from './validation';
const fields = [
  'checkins',
  'actions',
  'actionFeedback',
  'savedActions',
  'aiConversations',
  'contextualMemory',
  'personalMemories',
  'insights',
  'insightFeedback',
  'fortunes',
  'treeLeaves',
  'placeChoices',
  'placeExperiences',
] as const;
/** Same-profile, additive restore. Keep current account/settings and never replay exported analytics. */
export function mergePersonalBackup(current: CamelliaState, input: unknown) {
  const parsed = validateStoredState(input, current);
  if (parsed.issues.length) throw new Error('INVALID_BACKUP');
  if (parsed.state.profile.id !== current.profile.id)
    throw new Error('BACKUP_OWNER_MISMATCH');
  const next = {
    ...current,
    version: current.version === 4 || parsed.state.version === 4 ? 4 : 3,
  } as CamelliaState;
  for (const field of fields) {
    const existing = (current[field] ?? []) as unknown as Record<
        string,
        unknown
      >[],
      incoming = (parsed.state[field] ?? []) as unknown as Record<
        string,
        unknown
      >[];
    const byId = new Map(existing.map((v) => [String(v.id ?? v.date), v]));
    for (const value of incoming) {
      const key = String(value.id ?? value.date),
        old = byId.get(key);
      if (!old) byId.set(key, value);
      else if (
        field === 'aiConversations' ||
        (field === 'treeLeaves' && old.status !== 'removed')
      ) {
        const nested = field === 'aiConversations' ? 'messages' : 'reflections';
        const items = new Map(
          ((old[nested] ?? []) as Record<string, unknown>[]).map((v) => [
            String(v.id),
            v,
          ]),
        );
        for (const v of (value[nested] ?? []) as Record<string, unknown>[])
          if (!items.has(String(v.id))) items.set(String(v.id), v);
        byId.set(key, {
          ...old,
          [nested]: [...items.values()].sort((a, b) =>
            String(a.createdAt).localeCompare(String(b.createdAt)),
          ),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    Object.assign(next, { [field]: [...byId.values()] });
  }
  return { ...next, updatedAt: new Date().toISOString() };
}
export function preserveBeforeRestore(current: CamelliaState) {
  const raw = localStorage.getItem('camellia-prototype-v3');
  if (!raw || JSON.parse(raw).profile?.id !== current.profile.id)
    throw new Error('LOCAL_BACKUP_CHANGED');
  const withoutTime = ({
    updatedAt: _time,
    ...value
  }: Record<string, unknown>) => value;
  const saved = withoutTime(JSON.parse(raw));
  const expected = withoutTime(
    serializeConversationState(current) as unknown as Record<string, unknown>,
  );
  if (JSON.stringify(saved) !== JSON.stringify(expected))
    throw new Error('LOCAL_BACKUP_CHANGED');
  const key = `camellia-local-backup:${current.profile.id}:restore-${crypto.randomUUID()}`;
  localStorage.setItem(key, raw);
  return key;
}
