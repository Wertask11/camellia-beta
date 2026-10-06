export interface CamelliaDeleteUser {
  uid: string;
  isAnonymous: boolean;
}

export const CAMELLIA_SYNC_DELETE_COLLECTIONS = ['daily', 'profile', 'imports'] as const;

export function syncedOwnerUids(keys: string[], owner: string | null) {
  const owners=keys.flatMap(key=>key.startsWith('camellia-sync-sent:')?[key.slice('camellia-sync-sent:'.length)]:key.startsWith('camellia-cloud-version:')?[key.slice('camellia-cloud-version:'.length)]:[]);
  if(owner)owners.push(owner);
  return [...new Set(owners.filter(Boolean))];
}

interface DeleteDependencies {
  getCurrentUser: () => Promise<CamelliaDeleteUser | null>;
  syncedOwnerUids: () => string[];
  deleteCloudData: (uid: string, assertCurrentUid: () => Promise<void>) => Promise<void>;
  clearLocalData: () => void;
}

/** Delete only after proving the active account owns every known sync marker. */
export async function deleteCamelliaData(deps: DeleteDependencies) {
  const user = await deps.getCurrentUser();
  const uid = user && !user.isAnonymous ? user.uid : null;
  const owners = [...new Set(deps.syncedOwnerUids().filter(Boolean))];

  if (!uid && owners.length) throw new Error('SIGN_IN_TO_DELETE_SYNCED_DATA');
  if (uid && owners.some((owner) => owner !== uid))
    throw new Error('OTHER_SCHOOLPARK_ACCOUNTS_HAVE_SYNCED_DATA');

  let cloudDeleted = false;
  if (uid) {
    const assertCurrentUid = async () => {
      const current = await deps.getCurrentUser();
      if (!current || current.isAnonymous || current.uid !== uid)
        throw new Error('ACCOUNT_CHANGED');
    };
    await assertCurrentUid();
    await deps.deleteCloudData(uid, assertCurrentUid);
    await assertCurrentUid();
    cloudDeleted = true;
  }

  deps.clearLocalData();
  return { cloudDeleted };
}
