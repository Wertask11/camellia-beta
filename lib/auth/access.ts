'use client';
import { authHeaders, CAMELLIA_AUTH_API } from './camellia';

/* Women only, by invite. SchoolPark's backend decides (backend/camellia-access.js): whether invites are
   required, whether this person is in, and whether her account is stopped. The server checks the same thing
   again before a conversation or Circle (lib/server/eligibility.ts); this side only decides what to show. */
export type AccessStatus = { inviteRequired: boolean; needsInvite: boolean; suspended: boolean; admitted: boolean };
export type InviteResult = 'accepted' | 'already' | 'not_found' | 'used_up' | 'expired' | 'revoked' | 'own' | 'invalid' | 'rate_limited' | 'suspended' | 'error';
export type MemberInvite = { code: string; uses: number; maxUses: number; url: string };

const PENDING_INVITE = 'camellia-pending-invite';
const PENDING_TTL_MS = 30 * 24 * 3600 * 1000;
// 8 of 23456789ABCDEFGHJKLMNPQRSTUVWXYZ: no 0 O 1 I, which are easy to misread.
const CODE_PATTERN = /^[2-9A-HJ-NP-Z]{8}$/;

/** "k7qm-2xpa" and "K7QM 2XPA" are the same code. Anything else is not a code. */
export function normalizeInviteCode(value: string) {
  const code = value.toUpperCase().replace(/[^0-9A-Z]/g, '');
  return CODE_PATTERN.test(code) ? code : '';
}
export const formatInviteCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/* An invite link opens Camellia before login. Keep the code until she has logged in, and take it out of
   the address bar so it is not shared again by copying the URL. utm_* stay for attribution. */
export function captureInviteFromUrl() {
  try {
    const url = new URL(location.href);
    const raw = url.searchParams.get('invite');
    if (raw === null) return;
    const code = normalizeInviteCode(raw);
    if (code) localStorage.setItem(PENDING_INVITE, JSON.stringify({ code, at: Date.now() }));
    url.searchParams.delete('invite');
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch { /* Storage unavailable: she can still type the code. */ }
}
export function pendingInvite() {
  try {
    const saved = JSON.parse(localStorage.getItem(PENDING_INVITE) || 'null') as { code?: unknown; at?: unknown } | null;
    if (saved && typeof saved.code === 'string' && typeof saved.at === 'number' && Date.now() - saved.at < PENDING_TTL_MS) return normalizeInviteCode(saved.code);
  } catch { /* unreadable: ask for the code */ }
  return '';
}
export function clearPendingInvite() { try { localStorage.removeItem(PENDING_INVITE); } catch { /* nothing to clear */ } }

/** null when the answer is unknown (offline, an older backend). The app then lets her in; the server still checks. */
export async function fetchAccess(): Promise<AccessStatus | null> {
  try {
    const response = await fetch(`${CAMELLIA_AUTH_API}/access`, { headers: await authHeaders() });
    if (!response.ok) return null;
    const data = await response.json() as Partial<AccessStatus>;
    return { inviteRequired: data.inviteRequired === true, needsInvite: data.needsInvite === true, suspended: data.suspended === true, admitted: data.admitted === true };
  } catch { return null; }
}

const RESULT: Record<string, InviteResult> = {
  INVITE_NOT_FOUND: 'not_found', INVITE_USED_UP: 'used_up', INVITE_EXPIRED: 'expired', INVITE_REVOKED: 'revoked',
  INVITE_OWN: 'own', INVITE_INVALID: 'invalid', RATE_LIMITED: 'rate_limited', SUSPENDED: 'suspended',
};
export async function redeemInvite(code: string): Promise<{ result: InviteResult; kind?: 'operator' | 'member'; label?: string }> {
  try {
    const response = await fetch(`${CAMELLIA_AUTH_API}/invite/redeem`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ code }) });
    const data = await response.json().catch(() => ({})) as { already?: boolean; kind?: string; label?: string; error?: string };
    if (!response.ok) return { result: RESULT[data.error ?? ''] ?? 'error' };
    if (data.already) return { result: 'already' };
    return { result: 'accepted', kind: data.kind === 'member' ? 'member' : 'operator', label: typeof data.label === 'string' ? data.label : '' };
  } catch { return { result: 'error' }; }
}
export const INVITE_MESSAGES: Record<Exclude<InviteResult, 'accepted' | 'already'>, string> = {
  not_found: 'この招待コードは見つかりませんでした。もう一度確かめてください。',
  used_up: 'この招待コードは、使える人数に達しています。招待してくれた方に確かめてください。',
  expired: 'この招待コードは、有効期限が過ぎています。',
  revoked: 'この招待コードは、もう使えません。',
  own: 'ご自分が配っている招待コードは使えません。',
  invalid: '招待コードは8文字です（例：K7QM-2XPA）。',
  rate_limited: '何度も試したため、少し時間をおいてからもう一度お試しください。',
  suspended: 'このアカウントの利用を止めています。',
  error: 'いまは確かめられませんでした。通信を確認して、もう一度お試しください。',
};

/** The code she hands to friends (up to 3). create=false only reads it. */
export async function memberInvite(create: boolean): Promise<MemberInvite | null> {
  const response = await fetch(`${CAMELLIA_AUTH_API}/invite/mine`, { method: create ? 'POST' : 'GET', headers: await authHeaders() });
  const data = await response.json().catch(() => ({})) as { invite?: MemberInvite | null; error?: string };
  if (!response.ok) throw Object.assign(new Error(data.error || 'INVITE_FAILED'), { code: data.error });
  return data.invite ?? null;
}

/* The answer comes from SchoolPark's server, which can take a while to wake up. Someone already let in sees
   Camellia at once from the last answer, and the check finishes in the background. */
const ACCESS_CACHE = 'camellia-access:';
export function cachedAccess(uid: string): AccessStatus | null {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCESS_CACHE + uid) || 'null') as Partial<AccessStatus> | null;
    return saved ? { inviteRequired: saved.inviteRequired === true, needsInvite: saved.needsInvite === true, suspended: saved.suspended === true, admitted: saved.admitted === true } : null;
  } catch { return null; }
}
export function rememberAccess(uid: string, status: AccessStatus) {
  try { localStorage.setItem(ACCESS_CACHE + uid, JSON.stringify(status)); } catch { /* the next start asks again */ }
}
