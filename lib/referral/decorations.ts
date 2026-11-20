import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import { ReferralService, ReferralError } from './service.js';
import type { Auth } from 'firebase-admin/auth';
export type TreeDecoration = { id: string; label: string; assetPath: string };
export function approvedCatalog(value: unknown): TreeDecoration[] {
  if (!value || typeof value !== 'object') return [];
  const v = value as Record<string, unknown>;
  if (
    v.approved !== true ||
    !Array.isArray(v.items) ||
    typeof v.approvedBy !== 'string' ||
    !v.approvedBy ||
    typeof v.approvedAt !== 'string' ||
    !Number.isFinite(Date.parse(v.approvedAt))
  )
    return [];
  const items = v.items.filter((item): item is TreeDecoration =>
    Boolean(
      item &&
      typeof item === 'object' &&
      /^[a-z0-9-]{1,80}$/.test(item.id) &&
      typeof item.label === 'string' &&
      item.label.length > 0 &&
      item.label.length <= 80 &&
      typeof item.assetPath === 'string' &&
      /^\/decorations\/[a-z0-9-]+\.(svg|png|webp)$/.test(item.assetPath),
    ),
  );
  return items.length === v.items.length &&
    new Set(items.map((v) => v.id)).size === items.length
    ? items
    : [];
}
export class TreeDecorationService {
  constructor(
    private db: Firestore,
    private auth: Pick<Auth, 'getUser'>,
  ) {}
  private credits(uid: string) {
    return this.db.collection(
      `camellia_users/${uid}/admin/referral_decorations/items`,
    );
  }
  async list(uid: string, after?: unknown) {
    if (
      after !== undefined &&
      (typeof after !== 'string' || !/^[a-f0-9]{64}$/.test(after))
    )
      throw new ReferralError(400, 'INVALID_DECORATION');
    let page = this.credits(uid).orderBy(FieldPath.documentId()).limit(101);
    if (typeof after === 'string') page = page.startAfter(after);
    const [cfg, credits, equipment] = await Promise.all([
      this.db.doc(`${SERVER_ROOT}/config/tree_decoration_catalog`).get(),
      page.get(),
      this.db
        .doc(`camellia_users/${uid}/admin/tree_decoration_equipment`)
        .get(),
    ]);
    const catalog = approvedCatalog(cfg.data()),
      rows = credits.docs.slice(0, 100).map(
        (d) =>
          ({ id: d.id, ...d.data() }) as Record<string, unknown> & {
            id: string;
          },
      ),
      owned = rows
        .filter((v) => v.claimed === true && v.permanent === true)
        .map((v) => ({
          creditId: v.id,
          decorationId: String(v.decorationId),
          decoration: catalog.find((c) => c.id === v.decorationId) ?? null,
        })),
      choices = rows
        .filter((v) => v.claimed === false && v.permanent === true)
        .map((v) => ({
          creditId: v.id,
          options: catalog.filter(
            (c) => Array.isArray(v.catalogIds) && v.catalogIds.includes(c.id),
          ),
        })),
      activeId = equipment.data()?.decorationId;
    // Equipment must not disappear merely because its permanent credit is on another page.
    const activeCredit =
      typeof activeId === 'string'
        ? (
            await this.credits(uid)
              .where('decorationId', '==', activeId)
              .limit(1)
              .get()
          ).docs[0]?.data()
        : undefined;
    return {
      owned,
      choices,
      active:
        activeCredit?.claimed === true && activeCredit.permanent === true
          ? (catalog.find((c) => c.id === activeId) ?? null)
          : null,
      moreCredits: credits.size > 100,
      nextCursor: credits.size > 100 ? credits.docs[99].id : undefined,
      catalogReady: catalog.length > 0,
    };
  }
  async claim(uid: string, creditId: string, decorationId: string) {
    if (!/^[a-f0-9]{64}$/.test(creditId))
      throw new ReferralError(400, 'INVALID_DECORATION');
    const [config, credit] = await Promise.all([
        this.db.doc(`${SERVER_ROOT}/config/tree_decoration_catalog`).get(),
        this.credits(uid).doc(creditId).get(),
      ]),
      v = credit.data();
    if (
      !approvedCatalog(config.data()).some((c) => c.id === decorationId) ||
      v?.permanent !== true ||
      !Array.isArray(v.catalogIds) ||
      !v.catalogIds.includes(decorationId)
    )
      throw new ReferralError(403, 'DECORATION_NOT_AVAILABLE');
    await new ReferralService(this.db, this.auth).claimDecoration(
      uid,
      creditId,
      decorationId,
    );
    return this.list(uid);
  }
  async equip(uid: string, decorationId: unknown) {
    if (
      decorationId !== null &&
      (typeof decorationId !== 'string' ||
        !/^[a-z0-9-]{1,80}$/.test(decorationId))
    )
      throw new ReferralError(400, 'INVALID_DECORATION');
    if (decorationId !== null) {
      const [config, owned] = await Promise.all([
          this.db.doc(`${SERVER_ROOT}/config/tree_decoration_catalog`).get(),
          this.credits(uid)
            .where('decorationId', '==', decorationId)
            .limit(1)
            .get(),
        ]),
        credit = owned.docs[0]?.data();
      if (
        !approvedCatalog(config.data()).some((c) => c.id === decorationId) ||
        credit?.claimed !== true ||
        credit.permanent !== true
      )
        throw new ReferralError(403, 'DECORATION_NOT_AVAILABLE');
    }
    // Equipment is optional and separate from earned permanent ownership and private Tree content.
    await this.db
      .doc(`camellia_users/${uid}/admin/tree_decoration_equipment`)
      .set({ decorationId, updatedAt: new Date().toISOString() });
    return this.list(uid);
  }
}
