import type { Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from '../server/admin.js';
import { ReferralService, ReferralError } from './service.js';
import type { Auth } from 'firebase-admin/auth';
export type TreeDecoration = { id: string; label: string; assetPath: string };
function approvedCatalog(value: unknown): TreeDecoration[] {
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
  async list(uid: string) {
    const [cfg, credits, equipment] = await Promise.all([
      this.db.doc(`${SERVER_ROOT}/config/tree_decoration_catalog`).get(),
      this.credits(uid).limit(101).get(),
      this.db
        .doc(`camellia_users/${uid}/admin/tree_decoration_equipment`)
        .get(),
    ]);
    const catalog = approvedCatalog(cfg.data()),
      rows = credits.docs
        .slice(0, 100)
        .map(
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
    return {
      owned,
      choices,
      active:
        owned.find((v) => v.decorationId === activeId)?.decoration ?? null,
      moreCredits: credits.size > 100,
      catalogReady: catalog.length > 0,
    };
  }
  async claim(uid: string, creditId: string, decorationId: string) {
    const current = await this.list(uid);
    if (
      !current.choices.some(
        (v) =>
          v.creditId === creditId &&
          v.options.some((c) => c.id === decorationId),
      ) &&
      !current.owned.some(
        (v) =>
          v.creditId === creditId &&
          v.decorationId === decorationId &&
          v.decoration,
      )
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
    const current = await this.list(uid);
    if (
      decorationId !== null &&
      !current.owned.some(
        (v) => v.decorationId === decorationId && v.decoration,
      )
    )
      throw new ReferralError(403, 'DECORATION_NOT_AVAILABLE');
    // Equipment is optional and separate from earned permanent ownership and private Tree content.
    await this.db
      .doc(`camellia_users/${uid}/admin/tree_decoration_equipment`)
      .set({ decorationId, updatedAt: new Date().toISOString() });
    return this.list(uid);
  }
}
