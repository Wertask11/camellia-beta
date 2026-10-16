/** Operator-run only. Never invoked by build, server routes, or tests. */
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const [operation, uid] = process.argv.slice(2);
if (!['--grant', '--revoke'].includes(operation) || !uid || uid.length > 128)
  throw new Error(
    'Usage: node scripts/circle-moderator.mjs --grant|--revoke <Firebase UID>',
  );
const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 'null');
if (account?.project_id !== 'emusch-2a111')
  throw new Error('Expected Camellia Firebase project credentials');
const app = initializeApp({ credential: cert(account) });
const auth = getAuth(app),
  user = await auth.getUser(uid);
if (user.disabled) throw new Error('Cannot assign a disabled account');
const claims = { ...user.customClaims };
if (operation === '--grant') claims.camelliaModerator = true;
else delete claims.camelliaModerator;
await auth.setCustomUserClaims(uid, claims);
console.log(
  operation === '--grant'
    ? 'Circle moderator granted. Sign in again to refresh permissions.'
    : 'Circle moderator revoked. Existing ID tokens can remain valid for up to one hour.',
);
