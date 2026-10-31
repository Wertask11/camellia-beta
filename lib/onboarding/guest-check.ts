import type { Checkin, Mood } from '@/types';
import { checkInputError } from '@/lib/check';
import { jstDate } from '@/lib/fortune/engine';

export const GUEST_CHECK_KEY = 'camellia-guest-check-v1';
export const GUEST_OAUTH_KEY = 'camellia-guest-check-oauth-v1';
export const GUEST_CHECK_CHANGED = 'camellia-guest-check-changed';
export const GUEST_TTL_MS = 30 * 60_000;
export const GUEST_OAUTH_TTL_MS = 10 * 60_000;
type Method = 'line' | 'google';
export type GuestCheck = {
  version: 1;
  check: Checkin;
  expiresAt: number;
  phase: 'preview' | 'pending' | 'bound';
  method?: Method;
  attempt?: string;
  ownerUid?: string;
  entrySession?: string;
  shown: string[];
};
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const owner = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\s/]/.test(v);
let memory: GuestCheck | undefined;
let loaded = false;
let storageUnavailable = false;
const changed = () => { if (typeof window !== 'undefined') window.dispatchEvent(new window.Event(GUEST_CHECK_CHANGED)); };

/** Fixed, typed Check fields only. No free text, profile, URL or client-owned metadata. */
export function guestCheckValue(value: unknown, now = Date.now()): Checkin | undefined {
  if (!value || typeof value !== 'object') return;
  const v = value as Record<string, unknown>;
  if (!uuid(v.id) || typeof v.createdAt !== 'string' || typeof v.updatedAt !== 'string' ||
      !Number.isFinite(Date.parse(v.createdAt)) || v.updatedAt !== v.createdAt ||
      Date.parse(v.createdAt) > now + 60_000 || now - Date.parse(v.createdAt) > GUEST_TTL_MS ||
      jstDate(new Date(v.createdAt)) !== jstDate(new Date(now)) ||
      ![1, 2, 3, 4, 5].includes(v.mood as number)) return;
  if (v.sleep !== undefined && (typeof v.sleep !== 'number' || !Number.isFinite(v.sleep) || v.sleep < 0 || v.sleep > 14)) return;
  if (v.body !== undefined && (typeof v.body !== 'string' || !['良い', '普通', '疲れ気味', '悪い'].includes(v.body))) return;
  if (v.stress !== undefined && (typeof v.stress !== 'string' || !['低い', '普通', 'やや高い', '高い'].includes(v.stress))) return;
  return { id: v.id, mood: v.mood as Mood, createdAt: v.createdAt, updatedAt: v.updatedAt,
    ...(v.sleep !== undefined ? { sleep: v.sleep as number } : {}),
    ...(v.body !== undefined ? { body: v.body as Checkin['body'] } : {}),
    ...(v.stress !== undefined ? { stress: v.stress as Checkin['stress'] } : {}) };
}
export function parseGuestCheck(value: unknown, now = Date.now()): GuestCheck | undefined {
  if (!value || typeof value !== 'object') return;
  const v = value as Record<string, unknown>, check = guestCheckValue(v.check, now);
  if (v.version !== 1 || !check || typeof v.expiresAt !== 'number' || !Number.isFinite(v.expiresAt) || v.expiresAt <= now || v.expiresAt > now + GUEST_TTL_MS ||
      !['preview', 'pending', 'bound'].includes(String(v.phase))) return;
  if (v.phase === 'pending' && (!uuid(v.attempt) || !['line', 'google'].includes(String(v.method)))) return;
  if (v.phase === 'bound' && (!owner(v.ownerUid) || !uuid(v.attempt))) return;
  return { version: 1, check, expiresAt: v.expiresAt, phase: v.phase as GuestCheck['phase'],
    ...(v.method === 'line' || v.method === 'google' ? { method: v.method } : {}),
    ...(uuid(v.attempt) ? { attempt: v.attempt } : {}), ...(owner(v.ownerUid) ? { ownerUid: v.ownerUid } : {}),
    ...(uuid(v.entrySession) ? { entrySession: v.entrySession } : {}),
    shown: Array.isArray(v.shown) ? v.shown.filter((x): x is string => ['result', 'prompt'].includes(String(x))).slice(0, 2) : [] };
}
function write(value: GuestCheck | undefined) {
  memory = value; loaded = true;
  try { if(value)sessionStorage.setItem(GUEST_CHECK_KEY, JSON.stringify(value));else sessionStorage.removeItem(GUEST_CHECK_KEY); }
  catch { storageUnavailable = true; }
  changed();
}
function removeBridge() { try { localStorage.removeItem(GUEST_OAUTH_KEY); } catch { /* no bridge */ } }
function readBridge(now = Date.now()): { state: string; draft: GuestCheck; expiresAt: number } | undefined {
  try {
    const raw = localStorage.getItem(GUEST_OAUTH_KEY);
    if (!raw) return;
    if (raw.length > 3500) { removeBridge(); return; }
    const v = JSON.parse(raw), draft = parseGuestCheck(v.draft, now);
    if (!draft || draft.phase !== 'pending' || draft.method !== 'line' || typeof v.state !== 'string' ||
        !/^[A-Za-z0-9_-]{16,128}$/.test(v.state) || typeof v.expiresAt !== 'number' ||
        v.expiresAt <= now || v.expiresAt > now + GUEST_OAUTH_TTL_MS) { removeBridge(); return; }
    return { state: v.state, draft, expiresAt: v.expiresAt };
  } catch { removeBridge(); return; }
}
export function readGuestCheck(now = Date.now()): GuestCheck | undefined {
  readBridge(now); // expire a stranded OAuth bridge on the next visit
  if (!loaded && typeof sessionStorage !== 'undefined') {
    loaded = true;
    try { const raw = sessionStorage.getItem(GUEST_CHECK_KEY); memory = raw && raw.length <= 3500 ? parseGuestCheck(JSON.parse(raw), now) : undefined; if(raw&&!memory)sessionStorage.removeItem(GUEST_CHECK_KEY); }
    catch { storageUnavailable = true; }
  }
  if (memory && !parseGuestCheck(memory, now)) { write(undefined); return; }
  return memory;
}
export function createGuestCheck(input: { mood: Mood } & Partial<Checkin>, entrySession?: string, now = Date.now()) {
  if (checkInputError(input)) throw new Error('INVALID_GUEST_CHECK');
  const at = new Date(now).toISOString();
  const check = guestCheckValue({ ...input, id: crypto.randomUUID(), createdAt: at, updatedAt: at }, now);
  if (!check) throw new Error('INVALID_GUEST_CHECK');
  removeBridge();
  const draft: GuestCheck = { version: 1, check, phase: 'preview', expiresAt: now + GUEST_TTL_MS,
    ...(uuid(entrySession) ? { entrySession } : {}), shown: [] };
  write(draft); return draft;
}
export function clearGuestCheck() { removeBridge(); write(undefined); }
export function markGuestShown(stage: 'result' | 'prompt') {
  const draft = readGuestCheck();
  if (!draft || draft.shown.includes(stage)) return false;
  // Mark before forwarding an event so React StrictMode/reload cannot emit the same impression twice.
  write({ ...draft, shown: [...draft.shown, stage] }); return true;
}
export function armGuestLogin(method: Method) {
  const draft = readGuestCheck();
  if (!draft || draft.phase === 'bound') return false;
  removeBridge(); write({ ...draft, phase: 'pending', method, attempt: crypto.randomUUID(), ownerUid: undefined }); return true;
}
export function cancelGuestLogin() {
  removeBridge(); const draft = readGuestCheck();
  if (draft?.phase === 'pending') write({ ...draft, phase: 'preview', method: undefined, attempt: undefined, ownerUid: undefined });
}
/** Only while an explicit guest-save LINE login is in flight. Never created during ordinary Check. */
export function bridgeGuestOAuth(state: string, now = Date.now()) {
  const draft = readGuestCheck(now);
  if (!draft || draft.phase !== 'pending' || draft.method !== 'line') return;
  try { localStorage.setItem(GUEST_OAUTH_KEY, JSON.stringify({ state, draft, expiresAt: Math.min(draft.expiresAt, now + GUEST_OAUTH_TTL_MS) })); return true; }
  catch { storageUnavailable = true; return false; }
}
/** Called only after the existing nonce/state and token exchange have succeeded. */
export function completeGuestOAuth(state: string, uid: string, now = Date.now()) {
  const bridge = readBridge(now), local = readGuestCheck(now);
  if (!bridge || bridge.state !== state || !owner(uid)) { cancelGuestLogin(); return false; }
  if (local && (local.check.id !== bridge.draft.check.id || local.attempt !== bridge.draft.attempt)) { removeBridge(); return false; }
  removeBridge(); write({ ...bridge.draft, phase: 'bound', ownerUid: uid }); return true;
}
export function completeGuestGoogle(uid: string) {
  const draft = readGuestCheck();
  if (!draft || draft.phase !== 'pending' || draft.method !== 'google' || !owner(uid)) return false;
  removeBridge(); write({ ...draft, phase: 'bound', ownerUid: uid }); return true;
}
export function guestEventProperties(draft = readGuestCheck()): Record<string, string> {
  return { entry_flow: 'check_first', ...(uuid(draft?.entrySession) ? { entry_session: draft.entrySession } : {}) };
}
/** No implicit guest import. The current verified account must be the one that completed this attempt. */
export function guestForAccount(uid: string, now = Date.now()) {
  const draft = readGuestCheck(now);
  return draft?.phase === 'bound' && draft.ownerUid === uid ? draft : undefined;
}
export function finishGuestTransfer(id: string, uid: string) {
  const draft = guestForAccount(uid);
  if (!draft || draft.check.id !== id) return false;
  clearGuestCheck(); return true;
}
/** Inaccessible session storage must be visible to the flow; do not silently promise OAuth persistence. */
export function guestStorageIsUnavailable() { return storageUnavailable; }
