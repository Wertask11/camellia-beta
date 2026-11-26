import type { Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import { validatePlace } from './model.js';

/**
 * Prepared "introduction" listings (data/place-introductions-*.ts).
 * - ready entries were checked against public, primary sources and are published with that source recorded.
 * - the rest are saved as drafts for the operator to confirm and publish in the app.
 * A place that already exists (any status, including suspended or edited by the operator) is never overwritten.
 */
export type IntroductionDraftInput = {
  slug: string; name: string; category: string; area: string; recommendedFor: string[]; tags: string[];
  shortDescription: string; description: string; check?: string;
  officialUrl?: string; address?: string; openingHours?: string; priceRange?: string;
  sourceEvidence?: string; ready?: boolean;
};
export function introductionDraft(input: IntroductionDraftInput, region = '福岡') {
  const { check: _check, ready: _ready, sourceEvidence: _source, ...place } = input;
  return validatePlace({
    ...place,
    region,
    listingType: 'introduction',
    imageUrls: [],
    partnerStatus: 'none',
    sponsored: false,
    specialOffer: '',
  });
}
/** Same conditions as publishing an introduction in the app (PlaceService.change 'publish'). */
export function publishable(input: IntroductionDraftInput) {
  const draft = introductionDraft(input), source = input.sourceEvidence?.trim() ?? '';
  return input.ready === true && Boolean(draft.officialUrl && draft.address && draft.openingHours) && source.length > 0 && source.length <= 300;
}
/**
 * publishDrafts: a later batch may publish places that an earlier batch saved as drafts, once they are checked.
 * Only a draft the operator has not edited since it was imported (updatedAt === createdAt) is published;
 * anything else (edited, published, suspended) is left as it is.
 */
export async function importIntroductions(db: Firestore, inputs: IntroductionDraftInput[], apply: boolean, now = new Date().toISOString(), publishDrafts = false) {
  const entries = inputs.map((input) => ({ draft: introductionDraft(input), publish: publishable(input), source: input.sourceEvidence?.trim() ?? '' })); // validate all first
  if (new Set(entries.map((e) => e.draft.slug)).size !== entries.length) throw new Error('DUPLICATE_SLUG');
  const published: string[] = [], drafted: string[] = [], skipped: string[] = [];
  for (const { draft, publish, source } of entries) {
    const ref = db.doc(`${SERVER_ROOT}/places/${draft.slug}`);
    const untouchedDraft = (data: Record<string, unknown> | undefined) =>
      publishDrafts && publish && data?.status === 'draft' && data.listingType === 'introduction' && typeof data.createdAt === 'string' && data.updatedAt === data.createdAt;
    if (!apply) {
      const current = await ref.get();
      (current.exists && !untouchedDraft(current.data()) ? skipped : publish ? published : drafted).push(draft.slug);
      continue;
    }
    const wrote = await db.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (current.exists && !untouchedDraft(current.data())) return false;
      const before = current.exists ? current.data()! : null;
      const review = { listingType: 'introduction', realConfirmed: true, detailsConfirmed: true, sourceEvidence: source };
      const createdAt = typeof before?.createdAt === 'string' ? before.createdAt : now;
      const next = publish
        ? { ...draft, status: 'published', createdAt, updatedAt: now, publishedAt: now, verifiedAt: now, reviewVersion: 2, review }
        : { ...draft, status: 'draft', createdAt, updatedAt: now };
      if (before) tx.set(ref, next);
      else tx.create(ref, next);
      tx.set(db.collection(`${SERVER_ROOT}/place_audit`).doc(), {
        operatorUid: 'script:place-introductions', slug: draft.slug, operation: publish ? 'publish' : 'save', createdAt: now,
        verified: publish, partnerConfirmed: false, before, ...(publish ? { review } : {}),
        after: { ...draft, status: publish ? 'published' : 'draft' },
      });
      return true;
    });
    (wrote ? (publish ? published : drafted) : skipped).push(draft.slug);
  }
  return { published, drafted, skipped };
}
/**
 * Runs a batch once on the server (Vercel has the Firebase credentials). Only when the operator names the batch in
 * CAMELLIA_PLACE_INTRODUCTION_BATCH. A marker stops it from running again, so places the operator later
 * suspends or deletes are not brought back.
 */
export async function ensureIntroductionBatch(db: Firestore, batch: string, inputs: IntroductionDraftInput[], now = new Date().toISOString(), publishDrafts = false) {
  const marker = db.doc(`${SERVER_ROOT}/config/place_introduction_batches`);
  if ((await marker.get()).data()?.[batch]) return undefined;
  const result = await importIntroductions(db, inputs, true, now, publishDrafts);
  await marker.set({ [batch]: { at: now, published: result.published.length, drafted: result.drafted.length, skipped: result.skipped.length } }, { merge: true });
  return result;
}
