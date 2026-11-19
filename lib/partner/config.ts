import type {Firestore} from 'firebase-admin/firestore';
import {SERVER_ROOT} from '../server/admin.js';
/** Separate deployment and operator approvals. No browser flag, paid assertion or URL can enable sharing. */
export function sharingConfiguration(value: unknown, env: Record<string,string|undefined> = process.env) {
 if (env.CAMELLIA_PARTNER_SHARING_ENABLED !== 'true' || !value || typeof value !== 'object' || Array.isArray(value)) return false;
 const v=value as Record<string,unknown>;
 return v.enabled===true&&v.approved===true&&v.privacyReviewed===true&&v.entitlementsReviewed===true&&typeof v.approvedBy==='string'&&v.approvedBy.length>0&&typeof v.approvedAt==='string'&&Number.isFinite(Date.parse(v.approvedAt))&&v.version==='partner_v1';
}
export async function partnerSharingReady(db:Firestore) {
 if(process.env.CAMELLIA_PARTNER_SHARING_ENABLED!=='true')return false;
 return sharingConfiguration((await db.doc(`${SERVER_ROOT}/config/partner_sharing`).get()).data());
}
