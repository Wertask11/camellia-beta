import type { CamelliaState } from '@/types';

export const SERVER_CONSENT_KEY = 'camellia-server-data-consent-v1';
export const SERVER_SESSION_KEY = 'camellia-server-session-v1';
export const SERVER_CONSENT_VERSION = 'camellia-server-storage-v1';

type Consent = { version: string; acceptedAt: string };
type Session = { userId: string; token: string; profileId: string };

const apiBase = () =>
  (import.meta.env.VITE_CAMELLIA_API_BASE || 'https://emu-realtime.onrender.com/api/camellia-official').replace(/\/$/, '');

export function readServerConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(localStorage.getItem(SERVER_CONSENT_KEY) || 'null');
    if (value?.version !== SERVER_CONSENT_VERSION || !Number.isFinite(Date.parse(value.acceptedAt))) return null;
    return { version: value.version, acceptedAt: value.acceptedAt };
  } catch { return null; }
}

function readSession(profileId: string): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(SERVER_SESSION_KEY) || 'null');
    if (!value?.userId || !value?.token || value.profileId !== profileId) return null;
    return value;
  } catch { return null; }
}

async function register(profileId: string, consent: Consent): Promise<Session> {
  const response = await fetch(`${apiBase()}/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, consent }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `CAMELLIA_REGISTER_${response.status}`);
  const session = { userId: data.userId, token: data.token, profileId };
  localStorage.setItem(SERVER_SESSION_KEY, JSON.stringify(session));
  return session;
}

async function sessionFor(profileId: string, consent: Consent) {
  return readSession(profileId) || register(profileId, consent);
}

export async function syncCamelliaState(state: CamelliaState) {
  const consent = readServerConsent();
  if (!consent) return { skipped: true as const };
  let session = await sessionFor(state.profile.id, consent);
  const send = () => fetch(`${apiBase()}/state`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.token}`,
      'X-Camellia-User': session.userId,
    },
    body: JSON.stringify({ consent, state }),
  });
  let response = await send();
  if (response.status === 401) {
    localStorage.removeItem(SERVER_SESSION_KEY);
    session = await register(state.profile.id, consent);
    response = await send();
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `CAMELLIA_SYNC_${response.status}`);
  return { skipped: false as const, userId: session.userId };
}

export async function deleteServerData() {
  const consent = readServerConsent();
  let session: Session | null = null;
  try { session = JSON.parse(localStorage.getItem(SERVER_SESSION_KEY) || 'null'); } catch {}
  if (!consent || !session?.userId || !session?.token) return;
  const response = await fetch(`${apiBase()}/state`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${session.token}`, 'X-Camellia-User': session.userId },
  });
  if (!response.ok && response.status !== 404) throw new Error(`CAMELLIA_DELETE_${response.status}`);
  localStorage.removeItem(SERVER_SESSION_KEY);
}
