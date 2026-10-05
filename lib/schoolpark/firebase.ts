import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBKHS1D8Or6gfMd4NbzhDI7dG5Je7BLtbs',
  authDomain: 'schoolpark-emu.vercel.app',
  projectId: 'emusch-2a111',
  storageBucket: 'emusch-2a111.firebasestorage.app',
  messagingSenderId: '795496371585',
  appId: '1:795496371585:web:51deec91b8a2152e4c8480',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const schoolParkAuth = getAuth(app);
export const schoolParkDb = getFirestore(app);

export async function currentSchoolParkUser(): Promise<User | null> {
  await schoolParkAuth.authStateReady();
  return schoolParkAuth.currentUser;
}
