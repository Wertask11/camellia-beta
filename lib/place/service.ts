import type { Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import { validatePlace, validSlug, type Place } from './model.js';
export class PlaceError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
export type PlaceOperator = { uid: string; operator: boolean };
const permit = (identity: PlaceOperator) => {
  if (!identity.operator) throw new PlaceError(403, 'OPERATOR_REQUIRED');
};
export class PlaceService {
  constructor(private db: Firestore) {}
  private places() {
    return this.db.collection(`${SERVER_ROOT}/places`);
  }
  private project(id: string, data: Record<string, unknown>): Place {
    const safe = validatePlace(data);
    return {
      ...safe,
      id,
      status: data.status as Place['status'],
      createdAt: String(data.createdAt),
      updatedAt: String(data.updatedAt),
      ...(typeof data.publishedAt === 'string'
        ? { publishedAt: data.publishedAt }
        : {}),
    };
  }
  async list(cursor?: string, operator?: PlaceOperator) {
    if (operator) permit(operator);
    if (cursor && !validSlug(cursor))
      throw new PlaceError(400, 'INVALID_PLACE');
    let query = operator
      ? this.places().orderBy('slug')
      : this.places().where('status', '==', 'published').orderBy('slug');
    if (cursor) query = query.startAfter(cursor);
    const records = await query.limit(21).get();
    return {
      places: records.docs
        .slice(0, 20)
        .map((d) => this.project(d.id, d.data())),
      nextCursor: records.docs.length > 20 ? records.docs[19].id : undefined,
    };
  }
  async detail(slug: string, operator?: PlaceOperator) {
    if (operator) permit(operator);
    if (!validSlug(slug)) throw new PlaceError(400, 'INVALID_PLACE');
    const record = await this.places().doc(slug).get();
    if (!record.exists || (!operator && record.data()?.status !== 'published'))
      throw new PlaceError(404, 'NOT_FOUND');
    return this.project(record.id, record.data()!);
  }
  private saves(uid: string) {
    return this.db.collection(`camellia_users/${uid}/place_saves`);
  }
  async withSaved(places: Place[], uid?: string) {
    if (!uid || !places.length) return places;
    const marks = await this.db.getAll(
      ...places.map((place) => this.saves(uid).doc(place.slug)),
    );
    return places.map((place, index) => ({
      ...place,
      saved: marks[index].data()?.saved === true,
    }));
  }
  async saved(uid: string, cursor?: string) {
    if (cursor && !validSlug(cursor))
      throw new PlaceError(400, 'INVALID_PLACE');
    let query = this.saves(uid)
      .where('saved', '==', true)
      .orderBy('slug')
      .limit(21);
    if (cursor) query = query.startAfter(cursor);
    const records = await query.get();
    const docs = records.docs.slice(0, 20);
    const places = docs.length
      ? await this.db.getAll(...docs.map((d) => this.places().doc(d.id)))
      : [];
    return {
      places: places
        .filter((d) => d.exists && d.data()?.status === 'published')
        .map((d) => ({ ...this.project(d.id, d.data()!), saved: true })),
      nextCursor: records.docs.length > 20 ? docs[19].id : undefined,
    };
  }
  async bookmark(uid: string, slug: unknown, saved: unknown) {
    if (!validSlug(slug) || typeof saved !== 'boolean')
      throw new PlaceError(400, 'INVALID_PLACE');
    await this.db.runTransaction(async (tx) => {
      if (saved) {
        const place = await tx.get(this.places().doc(slug));
        if (place.data()?.status !== 'published')
          throw new PlaceError(404, 'NOT_FOUND');
      }
      tx.set(this.saves(uid).doc(slug), {
        slug,
        saved,
        updatedAt: new Date().toISOString(),
      });
    });
    return { saved };
  }
  async change(
    identity: PlaceOperator,
    operation: unknown,
    body: Record<string, unknown>,
  ) {
    permit(identity);
    const input =
      body.place && typeof body.place === 'object' && !Array.isArray(body.place)
        ? (body.place as Record<string, unknown>)
        : {};
    const slug = operation === 'save' ? input.slug : body.slug;
    if (!validSlug(slug)) throw new PlaceError(400, 'INVALID_PLACE');
    const ref = this.places().doc(slug);
    await this.db.runTransaction(async (tx) => {
      const previous = await tx.get(ref),
        data = previous.data();
      const now = new Date().toISOString();
      if (operation === 'save') {
        let safe;
        try {
          safe = validatePlace(input);
        } catch {
          throw new PlaceError(400, 'INVALID_PLACE');
        }
        tx.set(ref, {
          ...safe,
          status: 'draft',
          createdAt: data?.createdAt ?? now,
          updatedAt: now,
        });
      } else {
        if (!previous.exists) throw new PlaceError(404, 'NOT_FOUND');
        if (operation === 'submit' && data?.status === 'draft')
          tx.update(ref, { status: 'review', updatedAt: now });
        else if (operation === 'publish' && data?.status === 'review') {
          if (
            body.verified !== true ||
            !data?.officialUrl ||
            !data?.address ||
            !data?.imageUrls?.length ||
            (data?.partnerStatus === 'partner' &&
              body.partnerConfirmed !== true)
          )
            throw new PlaceError(400, 'REVIEW_REQUIRED');
          tx.update(ref, {
            status: 'published',
            publishedAt: now,
            updatedAt: now,
            verifiedAt: now,
          });
        } else if (operation === 'suspend' && data?.status === 'published')
          tx.update(ref, { status: 'suspended', updatedAt: now });
        else throw new PlaceError(409, 'INVALID_TRANSITION');
      }
      tx.set(this.db.collection(`${SERVER_ROOT}/place_audit`).doc(), {
        operatorUid: identity.uid,
        slug,
        operation,
        createdAt: now,
        verified: body.verified === true,
        partnerConfirmed: body.partnerConfirmed === true,
      });
    });
    return { ok: true };
  }
}
