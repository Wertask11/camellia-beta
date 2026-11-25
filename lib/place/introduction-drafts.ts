import type { Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import { validatePlace } from './model.js';

/**
 * Prepared "introduction" drafts (data/place-introductions-*.json). Each is saved as a DRAFT only:
 * the operator still adds the official URL, address and opening hours from the official site,
 * records the source, and publishes it in the app. Existing places are never overwritten.
 */
export type IntroductionDraftInput = {
  slug: string; name: string; category: string; area: string; recommendedFor: string[]; tags: string[];
  shortDescription: string; description: string; check?: string;
};
export function introductionDraft(input: IntroductionDraftInput, region = '福岡') {
  return validatePlace({
    ...input,
    region,
    listingType: 'introduction',
    imageUrls: [],
    partnerStatus: 'none',
    sponsored: false,
    specialOffer: '',
  });
}
export async function importIntroductionDrafts(db: Firestore, inputs: IntroductionDraftInput[], apply: boolean, now = new Date().toISOString()) {
  const drafts = inputs.map((input) => introductionDraft(input)); // validate everything before writing anything
  if (new Set(drafts.map((d) => d.slug)).size !== drafts.length) throw new Error('DUPLICATE_SLUG');
  const created: string[] = [], skipped: string[] = [];
  for (const draft of drafts) {
    const ref = db.doc(`${SERVER_ROOT}/places/${draft.slug}`);
    if (!apply) {
      ((await ref.get()).exists ? skipped : created).push(draft.slug);
      continue;
    }
    const wrote = await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return false;
      tx.create(ref, { ...draft, status: 'draft', createdAt: now, updatedAt: now });
      tx.set(db.collection(`${SERVER_ROOT}/place_audit`).doc(), {
        operatorUid: 'script:place-introductions', slug: draft.slug, operation: 'save', createdAt: now,
        verified: false, partnerConfirmed: false, before: null, after: draft,
      });
      return true;
    });
    (wrote ? created : skipped).push(draft.slug);
  }
  return { created, skipped };
}
