import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const FIREBASE_PROJECT_ID = 'emusch-2a111';
export const SERVER_ROOT = 'camellia_admin/release_phase1';
export function adminConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}
export function serverAdmin() {
  if (!adminConfigured()) throw new Error('SERVER_STORAGE_NOT_CONFIGURED');
  const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!) as {
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
          privateKey: account.private_key,
        }),
        projectId: FIREBASE_PROJECT_ID,
      },
      name,
    );
  return { db: getFirestore(app), auth: getAuth(app) };
}
