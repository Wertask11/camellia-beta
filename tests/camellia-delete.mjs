import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ configFile: false, root, resolve: { alias: { '@': root } }, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { deleteCamelliaData, CAMELLIA_SYNC_DELETE_COLLECTIONS, syncedOwnerUids } = await server.ssrLoadModule('/lib/schoolpark/delete.ts');
  assert.deepEqual(syncedOwnerUids(['camellia-sync-sent:camellia:user-A','camellia-cloud-version:camellia:user-A','camellia-state-v3'],'camellia:user-A'),['camellia:user-A']);
  const makeHarness = ({ user = { uid: 'firebase-A', isAnonymous: false }, owners = ['firebase-A'], cloudError, switchUid } = {}) => {
    const local = new Map([['camellia-state-v3', 'personal data'], ['camellia-sync-sent:firebase-A', 'marker']]);
    let currentUid = user?.uid || null;
    let cloudCalls = 0;
    const clearLocalData = () => local.clear();
    const getCurrentUser = async () => currentUid ? { uid: currentUid, isAnonymous: false } : null;
    const operation = deleteCamelliaData({
      getCurrentUser,
      syncedOwnerUids: () => owners,
      deleteCloudData: async (uid, assertCurrentUid) => {
        cloudCalls++;
        assert.equal(uid, user?.uid, 'cloud deletion targets the signed-in Firebase UID');
        await assertCurrentUid();
        if (switchUid) currentUid = switchUid;
        if (cloudError) throw cloudError;
        await assertCurrentUid();
      },
      clearLocalData,
    });
    return { operation, local, get cloudCalls() { return cloudCalls; } };
  };

  const success = makeHarness();
  assert.deepEqual(await success.operation, { cloudDeleted: true });
  assert.equal(success.local.size, 0, 'local Camellia data is cleared only after cloud deletion succeeds');
  assert.equal(success.cloudCalls, 1);

  const cloudFailure = makeHarness({ cloudError: new Error('Firestore unavailable') });
  await assert.rejects(cloudFailure.operation, /Firestore unavailable/);
  assert.equal(cloudFailure.local.get('camellia-state-v3'), 'personal data', 'cloud failure preserves local user data');

  const signedOutWithHistory = makeHarness({ user: null, owners: ['firebase-A'] });
  await assert.rejects(signedOutWithHistory.operation, { message: 'SIGN_IN_TO_DELETE_SYNCED_DATA' });
  assert.equal(signedOutWithHistory.cloudCalls, 0);
  assert.equal(signedOutWithHistory.local.get('camellia-state-v3'), 'personal data');

  const localOnly = makeHarness({ user: null, owners: [] });
  assert.deepEqual(await localOnly.operation, { cloudDeleted: false }, 'signed-out local-only deletion does not claim cloud deletion');
  assert.equal(localOnly.local.size, 0);

  const otherAccount = makeHarness({ user: { uid: 'firebase-B', isAnonymous: false }, owners: ['firebase-A'] });
  await assert.rejects(otherAccount.operation, { message: 'OTHER_SCHOOLPARK_ACCOUNTS_HAVE_SYNCED_DATA' });
  assert.equal(otherAccount.cloudCalls, 0, 'another account is never passed to Firestore delete');
  assert.equal(otherAccount.local.get('camellia-state-v3'), 'personal data');

  const accountChanged = makeHarness({ switchUid: 'firebase-B' });
  await assert.rejects(accountChanged.operation, { message: 'ACCOUNT_CHANGED' });
  assert.equal(accountChanged.local.get('camellia-state-v3'), 'personal data', 'UID changes prevent local cleanup');

  assert.deepEqual(CAMELLIA_SYNC_DELETE_COLLECTIONS, ['daily', 'profile', 'imports']);
  const syncSource = await readFile(new URL('../lib/schoolpark/sync.ts', import.meta.url), 'utf8');
  assert.match(syncSource, /doc\(schoolParkDb, 'camellia_users', uid\)/, 'only the current user root document is targeted');
  assert.match(syncSource, /CAMELLIA_SYNC_DELETE_COLLECTIONS\.map/, 'child deletions use the explicit allowlist');
  assert.doesNotMatch(syncSource, /collection\(schoolParkDb, 'camellia_users', uid, '(admin|community|reports)'\)/, 'admin and unrelated collections are outside deletion scope');
  const privacy = await readFile(new URL('../screens/PrivacyScreen.tsx', import.meta.url), 'utf8');
  const myScreen = await readFile(new URL('../screens/MyScreen.tsx', import.meta.url), 'utf8');
  for (const source of [privacy, myScreen]) {
    assert.match(source, /運営用の管理記録・返信/);
    assert.match(source, /PostHogへ送信済みの操作イベントは削除されません/);
  }
  assert.match(myScreen, /PostHogへ送信済みの操作イベントは削除されていません/);

  console.log('Camellia deletion: PASS (cloud/local ordering, signed-out, cross-account, UID change, scope allowlist, admin/PostHog disclosure)');
} finally { await server.close(); }
