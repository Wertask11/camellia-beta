import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { Window } from 'happy-dom';
const w = new Window();
globalThis.localStorage = w.localStorage;
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  resolve: { alias: { '@': process.cwd() } },
  server: { middlewareMode: true, hmr: false },
});
try {
  const { emptyState } = await server.ssrLoadModule(
      '/hooks/useCamelliaStore.ts',
    ),
    { mergePersonalBackup, preserveBeforeRestore } = await server.ssrLoadModule(
      '/lib/storage/backup.ts',
    );
  const s = emptyState(),
    at = new Date().toISOString(),
    old = {
      ...s,
      version: 4,
      personalMemories: [
        { id: 'same', text: 'OLD', source: 'explicit_place', createdAt: at },
        { id: 'new', text: 'NEW', source: 'explicit_place', createdAt: at },
      ],
      analyticsEvents: [
        { id: 'do-not-replay', name: 'check_complete', createdAt: at },
      ],
    },
    current = {
      ...s,
      personalMemories: [
        {
          id: 'same',
          text: '',
          source: 'explicit_place',
          status: 'removed',
          createdAt: at,
        },
      ],
    };
  const merged = mergePersonalBackup(current, old);
  assert.equal(merged.version, 4);
  assert.equal(merged.personalMemories.length, 2);
  assert.equal(merged.personalMemories[0].status, 'removed');
  assert.equal(merged.analyticsEvents.length, 0);
  assert.equal(merged.profile, current.profile);
  assert.throws(() => mergePersonalBackup(current, { ...old, version: 99 }));
  assert.throws(
    () =>
      mergePersonalBackup(current, {
        ...old,
        profile: { ...s.profile, id: 'OTHER' },
      }),
    /OWNER_MISMATCH/,
  );
  const raw = JSON.stringify(current, null, 2);
  localStorage.setItem('camellia-prototype-v3', raw);
  const key = preserveBeforeRestore(current);
  assert.equal(localStorage.getItem(key), raw);
  localStorage.setItem(
    'camellia-prototype-v3',
    JSON.stringify({ ...current, personalMemories: old.personalMemories }),
  );
  assert.throws(() => preserveBeforeRestore(current), /LOCAL_BACKUP_CHANGED/);
  assert.equal(mergePersonalBackup(merged, old).personalMemories.length, 2);
  console.log(
    'PASS same-owner additive restore, tombstone protection, no analytics replay/settings rollback, unknown-version and foreign-owner rejection, exact original backup and idempotent import.',
  );
} finally {
  await server.close();
  await w.happyDOM.close();
}
