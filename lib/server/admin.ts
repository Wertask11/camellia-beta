import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { parseServiceAccountJson } from './credential-json.js';

export const FIREBASE_PROJECT_ID = 'emusch-2a111';
export const SERVER_ROOT = 'camellia_admin/release_phase1';
export function adminConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}
/** Local SDK/credential initialization only; does not read data or grant access. */
export function adminInitializationStatus() {
  if (!adminConfigured()) return 'not_configured';
  try {
    serverAdmin();
    return 'initialized';
  } catch (error) {
    if (error instanceof SyntaxError) return 'invalid_json';
    if (error instanceof Error && error.message === 'FIREBASE_PROJECT_MISMATCH')
      return 'wrong_project';
    const code =
      error && typeof error === 'object' && 'code' in error
        ? error.code
        : undefined;
    if (code === 'app/invalid-credential') return 'invalid_credential';
    if (code === 'ERR_REQUIRE_ESM') return 'sdk_incompatible';
    if (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND')
      return 'sdk_unavailable';
    return 'initialization_failed';
  }
}
export function serverAdmin() {
  if (!adminConfigured()) throw new Error('SERVER_STORAGE_NOT_CONFIGURED');
  const account = parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };
  if (account.project_id !== FIREBASE_PROJECT_ID)
    throw new Error('FIREBASE_PROJECT_MISMATCH');
  const name = 'camellia-phase1';
  const app =
    getApps().find((item) => item.name === name) ??
    initializeApp(
      {
        credential: cert({
          projectId: account.project_id,
          clientEmail: account.client_email,
          privateKey: account.private_key?.replace(/\\r\\n|\\n/g, '\n'),
        }),
        projectId: FIREBASE_PROJECT_ID,
      },
      name,
    );
  return { db: getFirestore(app), auth: getAuth(app) };
}
