import assert from 'node:assert/strict';
import fs from 'node:fs';

const hook = fs.readFileSync('hooks/useCamelliaStore.ts', 'utf8');
const firebase = fs.readFileSync('lib/schoolpark/firebase.ts', 'utf8');
const mapper = fs.readFileSync('lib/schoolpark/map.ts', 'utf8');
const sync = fs.readFileSync('lib/schoolpark/sync.ts', 'utf8');

assert.match(hook, /syncToSchoolPark\(state\)/);
assert.match(hook, /localStorage\.setItem\(STORAGE_KEY/);
assert.doesNotMatch(hook, /server-sync|deleteServerData|syncCamelliaState/);

assert.match(firebase, /projectId: 'emusch-2a111'/);
assert.doesNotMatch(firebase, /signInAnonymously/);
assert.match(firebase, /authStateReady/);

assert.match(mapper, /daily\/\$\{mapped\.date\}/);
assert.match(mapper, /profile\/basic/);
assert.match(mapper, /profile\/settings/);
assert.match(mapper, /profile\/chat/);
assert.match(mapper, /profile\/activity/);
assert.doesNotMatch(mapper, /admin\//);
assert.doesNotMatch(mapper, /camelliaId/);
assert.match(mapper, /agreedAt/);
assert.match(mapper, /slice\(-200\)/);
assert.match(mapper, /slice\(-300\)/);

assert.match(sync, /const WAIT_MS = 1500/);
assert.match(sync, /camellia-sync-sent/);
assert.match(sync, /sent\[entry\.path\] !== entry\.mark/);
assert.match(sync, /window\.addEventListener\('pagehide'/);
assert.match(sync, /runTransaction/);
assert.ok(
  sync.indexOf('await runTransaction') < sync.indexOf('sent[entry.path] = entry.mark'),
  'fingerprints must be saved only after Firestore accepts the batch',
);

console.log('schoolpark sync: PASS (authenticated-only, mapped, debounced, differential)');
