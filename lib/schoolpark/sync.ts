import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import type { CamelliaState } from '@/types';
import {
  currentSchoolParkUser,
  schoolParkAuth,
  schoolParkDb,
} from './firebase';
import { mapCamelliaState } from './map';

const SENT_KEY = 'camellia-sync-sent';
const WAIT_MS = 1500;
let latestState: CamelliaState | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let syncing: Promise<void> | null = null;
let rerunRequested = false;
let passportCache: { uid: string; value?: string } | null = null;

export function fingerprint(value: string) {
  let hash = 5381;
  for (let i = 0; i < value.length; i++)
    hash = ((hash * 33) ^ value.charCodeAt(i)) >>> 0;
  return `${hash.toString(36)}:${value.length}`;
}

function readSent(uid: string): Record<string, string> {
  try {
    return JSON.parse(
      localStorage.getItem(`${SENT_KEY}:${uid}`) || '{}',
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveSent(uid: string, sent: Record<string, string>) {
  localStorage.setItem(`${SENT_KEY}:${uid}`, JSON.stringify(sent));
}

async function readPassport(uid: string) {
  if (passportCache?.uid === uid) return passportCache.value;
  let value: string | undefined;
  try {
    const snapshot = await getDoc(doc(schoolParkDb, 'ches_accounts', uid));
    const data = snapshot.data();
    const candidate = data?.chesAddress || data?.walletAddress;
    if (typeof candidate === 'string' && candidate) value = candidate;
  } catch {
    // A Camellia-only account may not have permission or a Passport document.
  }
  passportCache = { uid, value };
  return value;
}

function reference(uid: string, path: string): DocumentReference {
  return path
    ? doc(schoolParkDb, 'camellia_users', uid, ...path.split('/'))
    : doc(schoolParkDb, 'camellia_users', uid);
}

async function performSync() {
  if (!latestState || typeof window === 'undefined') return;
  const user = await currentSchoolParkUser();
  if (!user) return;
  const uid = user.uid;
  const documents = mapCamelliaState(latestState, await readPassport(uid));
  const sent = readSent(uid);
  const changed = documents
    .map((entry) => {
      const serialized = JSON.stringify(entry.data);
      return { ...entry, mark: fingerprint(serialized) };
    })
    .filter((entry) => sent[entry.path] !== entry.mark);
  for (let offset = 0; offset < changed.length; offset += 400) {
    const part = changed.slice(offset, offset + 400);
    const batch = writeBatch(schoolParkDb);
    part.forEach((entry) =>
      batch.set(reference(uid, entry.path), entry.data, { merge: true }),
    );
    await batch.commit();
    part.forEach((entry) => {
      sent[entry.path] = entry.mark;
    });
    saveSent(uid, sent);
  }
}

export function flushSchoolParkSync() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (syncing) {
    rerunRequested = true;
    return syncing;
  }
  if (!syncing) {
    syncing = performSync()
      .catch((error) => {
        console.warn(
          'SchoolPark管理画面への同期に失敗しました:',
          error?.message || error,
        );
      })
      .finally(() => {
        syncing = null;
        if (rerunRequested) {
          rerunRequested = false;
          void flushSchoolParkSync();
        }
      });
  }
  return syncing;
}

export function syncToSchoolPark(state: CamelliaState) {
  if (typeof window === 'undefined') return;
  latestState = state;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flushSchoolParkSync();
  }, WAIT_MS);
}

if (typeof window !== 'undefined') {
  onAuthStateChanged(schoolParkAuth, (user) => {
    if (user && latestState) syncToSchoolPark(latestState);
  });
  window.addEventListener('pagehide', () => {
    void flushSchoolParkSync();
  });
}
