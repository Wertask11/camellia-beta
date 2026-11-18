import type {Firestore} from 'firebase-admin/firestore';
import {validSlug} from './model.js';
export const placeScopePath=(uid:string)=>`camellia_users/${uid}/admin/place_scope`;
export async function managedPlaceSlugs(db:Firestore,uid:string){const snap=await db.doc(placeScopePath(uid)).get();const slugs=snap.data()?.slugs;return Array.isArray(slugs)?[...new Set(slugs.filter(validSlug))].slice(0,100):[];}
