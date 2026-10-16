/** Deliberate operator CLI; never called by builds or app routes. */
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const [operation, uid] = process.argv.slice(2);
if (!['--grant', '--revoke'].includes(operation) || !uid || uid.length > 128)
  throw new Error(
    'Usage: node scripts/place-operator.mjs --grant|--revoke <UID>',
  );
const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 'null');
if (account?.project_id !== 'emusch-2a111')
  throw new Error('Expected Camellia project');
const auth = getAuth(initializeApp({ credential: cert(account) })),
  user = await auth.getUser(uid);
if (user.disabled) throw new Error('Disabled account');
const claims = { ...user.customClaims };
if (operation === '--grant') claims.camelliaPlaceOperator = true;
else delete claims.camelliaPlaceOperator;
await auth.setCustomUserClaims(uid, claims);
console.log(
  'Place operator permission updated. Sign in again; revoked claims may remain in existing ID tokens until expiry.',
);
