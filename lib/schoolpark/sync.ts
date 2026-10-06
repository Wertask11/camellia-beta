import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  runTransaction,
  type DocumentReference,
} from 'firebase/firestore';
import type { CamelliaState } from '@/types';
import {
  currentSchoolParkUser,
  schoolParkAuth,
  schoolParkDb,
} from './firebase';
import { mapCamelliaState } from './map';
import { hasPersonalData, restoreArchive } from './restore';
import { CAMELLIA_SYNC_DELETE_COLLECTIONS, deleteCamelliaData } from './delete';

const SENT_KEY = 'camellia-sync-sent';
const CONFLICT_KEY = 'camellia-sync-conflict';
const WAIT_MS = 1500;
let latestState: CamelliaState | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let syncing: Promise<void> | null = null;
let rerunRequested = false;
let passportCache: { uid: string; value: string } | null = null;
let preparedUid: string | null = null;
const OWNER_KEY = 'camellia-cache-owner';
const CLOUD_KEY = 'camellia-cloud-version:';
function rootSignature(data:Record<string,unknown>|undefined){return fingerprint(JSON.stringify(data?Object.fromEntries(Object.keys(data).sort().map(key=>[key,data[key]])):null));}
export async function prepareSchoolParkAccount(state: CamelliaState, uid: string) {
  preparedUid = null;
  const owner = localStorage.getItem(OWNER_KEY);
  if (owner && owner !== uid && hasPersonalData(state)) throw new Error('IDENTITY_CONFLICT');
  const user = await currentSchoolParkUser();
  if (!user || user.uid !== uid || user.isAnonymous) throw new Error('ACCOUNT_REQUIRED');
  const root = await getDoc(reference(uid, ''));
  const version=rootSignature(root.data());
  const known=localStorage.getItem(CLOUD_KEY+uid);
  if(owner===uid&&root.exists()&&known&&known!==version)throw new Error('SYNC_CONFLICT');
  let result = state;
  if (root.exists() && !owner) {
    const records = await getDocs(collection(schoolParkDb, 'camellia_users', uid, 'imports'));
    const remote = restoreArchive(records.docs.map(item=>item.data()), state);
    if (hasPersonalData(state)) throw new Error('SYNC_CONFLICT');
    if (!remote) throw new Error('REMOTE_RESTORE_UNAVAILABLE');
    result = remote;
  }
  if (schoolParkAuth.currentUser?.uid !== uid) throw new Error('ACCOUNT_CHANGED');
  localStorage.setItem(CLOUD_KEY+uid,version);
  localStorage.setItem(OWNER_KEY,uid);
  preparedUid = uid;
  return result;
}
const pausedUids = new Set<string>();

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
  // Do not cache a missing Passport: an anonymous user can link SchoolPark
  // without changing Firebase UID, and the refreshed custom token then adds it.
  if (passportCache?.uid === uid) return passportCache.value;
  let value: string | undefined;
  try {
    const claims = await schoolParkAuth.currentUser?.getIdTokenResult();
    if (typeof claims?.claims.schoolParkId === 'string' && claims.claims.schoolParkId)
      value = claims.claims.schoolParkId;
  } catch {
    // Fall back to the verified SchoolPark account document.
  }
  try {
    if (!value) {
      const snapshot = await getDoc(doc(schoolParkDb, 'ches_accounts', uid));
      const data = snapshot.data();
      const candidate = data?.spid;
      if (typeof candidate === 'string' && candidate.startsWith('SP-'))
        value = candidate;
    }
  } catch {
    // A Camellia-only account may not have permission or a Passport document.
  }
  if (value) passportCache = { uid, value };
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
  if (!user || user.isAnonymous || preparedUid !== user.uid) return;
  const uid = user.uid;
  if (pausedUids.has(uid)) return;
  const sent = readSent(uid);
  if(localStorage.getItem(`${CONFLICT_KEY}:${uid}`))throw new Error('SYNC_CONFLICT');
  const documents = mapCamelliaState(latestState, await readPassport(uid));
  const changed = documents
    .map((entry) => {
      const serialized = JSON.stringify(entry.data);
      return { ...entry, mark: fingerprint(serialized) };
    })
    .filter((entry) => sent[entry.path] !== entry.mark)
;
  for (let offset = 0; offset < changed.length; offset += 400) {
    const part = changed.slice(offset, offset + 400);
    const rootRef=reference(uid,'');
    const version=await runTransaction(schoolParkDb,async transaction=>{
      const current=await transaction.get(rootRef);
      if(schoolParkAuth.currentUser?.uid!==uid||preparedUid!==uid)throw new Error('ACCOUNT_CHANGED');
      const expected=localStorage.getItem(CLOUD_KEY+uid);
      if(rootSignature(current.data())!==expected)throw new Error('SYNC_CONFLICT');
      part.forEach(entry=>transaction.set(reference(uid,entry.path),entry.data,{merge:true}));
      const revision=crypto.randomUUID();
      const rootEntry=part.find(entry=>entry.path==='')?.data||{};
      transaction.set(rootRef,{syncRevision:revision},{merge:true});
      return rootSignature({...current.data(),...rootEntry,syncRevision:revision});
    });
    localStorage.setItem(CLOUD_KEY+uid,version);
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
  void currentSchoolParkUser().then((user) => {
    if (!user || user.isAnonymous || preparedUid !== user.uid) return;
    if (pausedUids.has(user.uid)) {
      const hasNewUserData = state.onboardingComplete || Boolean(
        state.profile.name || state.profile.age || state.profile.lifestyle ||
        state.profile.priority || state.profile.interests.length || state.checkins.length ||
        state.actions.length || state.aiConversations.length || state.fortunes.length ||
        state.treeLeaves.length,
      );
      if (!hasNewUserData) return;
      pausedUids.delete(user.uid);
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void flushSchoolParkSync();
    }, WAIT_MS);
  }).catch(() => {});
}

/** Remove only the signed-in user's synchronized Camellia records. */
export async function deleteSyncedCamelliaData(clearLocalData: () => void) {
  return deleteCamelliaData({
    getCurrentUser: currentSchoolParkUser,
    syncedOwnerUids: () => {
      const owners = Object.keys(localStorage)
        .filter((key) => key.startsWith(`${SENT_KEY}:`) || key.startsWith(CLOUD_KEY))
        .map((key) => key.slice(key.lastIndexOf(':') + 1));
      const owner = localStorage.getItem(OWNER_KEY);
      if (owner) owners.push(owner);
      return owners;
    },
    deleteCloudData: async (uid, assertCurrentUid) => {
      pausedUids.add(uid);
      if (timer) { clearTimeout(timer); timer = null; }
      if (syncing) await syncing;
      latestState = null;
      await assertCurrentUid();
      const root = doc(schoolParkDb, 'camellia_users', uid);
      const records = await Promise.all(CAMELLIA_SYNC_DELETE_COLLECTIONS.map((kind) =>
        getDocs(collection(schoolParkDb, 'camellia_users', uid, kind)),
      ));
      await assertCurrentUid();
      const refs = records.flatMap((snapshot) => snapshot.docs.map((item) => item.ref));
      refs.push(root);
      for (let offset = 0; offset < refs.length; offset += 400) {
        await assertCurrentUid();
        const batch = writeBatch(schoolParkDb);
        refs.slice(offset, offset + 400).forEach((ref) => batch.delete(ref));
        await batch.commit();
      }
      await assertCurrentUid();
      localStorage.removeItem(`${SENT_KEY}:${uid}`);
      localStorage.removeItem(`${CONFLICT_KEY}:${uid}`);
    },
    clearLocalData,
  });
}

if (typeof window !== 'undefined') {
  onAuthStateChanged(schoolParkAuth, (user) => {
    if (user && latestState) syncToSchoolPark(latestState);
  });
  window.addEventListener('pagehide', () => {
    void flushSchoolParkSync();
  });
}
