import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { SERVER_ROOT } from '../server/admin.js';
import { validSlug } from './model.js';
export async function changePlaceScope(
  db: Firestore,
  auth: Pick<Auth, 'getUser'>,
  input: {
    actorUid: string;
    targetUid: string;
    slugs: string[];
    reason: string;
    apply: boolean;
  },
) {
  if (
    ![input.actorUid, input.targetUid].every(
      (v) => typeof v === 'string' && /^[^/\\]{1,128}$/.test(v),
    ) ||
    !Array.isArray(input.slugs) ||
    input.slugs.length > 100 ||
    input.slugs.some((v) => !validSlug(v)) ||
    typeof input.reason !== 'string' ||
    !input.reason.trim() ||
    input.reason.length > 200
  )
    throw new Error('INVALID_SCOPE');
  const actor = await auth.getUser(input.actorUid);
  if (
    actor.disabled ||
    !(
      actor.customClaims?.camelliaAdmin === true ||
      actor.customClaims?.camelliaPlaceOperator === true
    )
  )
    throw new Error('OPERATOR_REQUIRED');
  // Revocation must remain possible after staff disablement or Auth deletion.
  if (input.slugs.length) {
    const target = await auth.getUser(input.targetUid);
    if (target.disabled) throw new Error('STAFF_DISABLED');
  }
  const ref = db.doc(`camellia_users/${input.targetUid}/admin/place_scope`),
    slugs = [...new Set(input.slugs)].sort();
  return db.runTransaction(async (tx) => {
    const old = await tx.get(ref);
    if (!input.apply)
      return { apply: false, before: old.data()?.slugs ?? [], after: slugs };
    tx.set(ref, {
      slugs,
      updatedAt: new Date().toISOString(),
      updatedBy: input.actorUid,
    });
    tx.create(db.collection(`${SERVER_ROOT}/place_scope_audit`).doc(), {
      actorUid: input.actorUid,
      targetUid: input.targetUid,
      before: old.data()?.slugs ?? [],
      after: slugs,
      reason: input.reason,
      at: new Date().toISOString(),
    });
    return { apply: true, slugs };
  });
}
