import { serverAdmin, adminConfigured } from '../../lib/server/admin.js';
import {
  requireEligibleUser,
  EligibilityError,
} from '../../lib/server/eligibility.js';
import { createSharedRateLimiter } from '../../lib/server/shared-limit.js';
import { TreeDecorationService } from '../../lib/referral/decorations.js';
import { ReferralError } from '../../lib/referral/service.js';
type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type Res = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (v: unknown) => void };
};
/** Existing earned rights remain accessible independently of new campaign acceptance and Free/Plus. */
export default async function decoration(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!adminConfigured())
    return res.status(503).json({ error: 'DECORATION_NOT_AVAILABLE' });
  try {
    const deps = serverAdmin(),
      header = req.headers.authorization,
      user = await requireEligibleUser(
        typeof header === 'string' && header.startsWith('Bearer ')
          ? header.slice(7)
          : '',
        deps,
      ),
      service = new TreeDecorationService(deps.db, deps.auth);
    if (
      !(await createSharedRateLimiter(
        deps.db,
        {},
        Date.now,
        'referral_rate_windows',
      ).take(`decoration:${user.uid}`))
    )
      return res.status(429).json({ error: 'SLOW_DOWN' });
    if (req.method === 'GET')
      return res.status(200).json(await service.list(user.uid));
    const v =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};
    if (
      req.method !== 'POST' ||
      Buffer.byteLength(JSON.stringify(v)) > 500 ||
      Object.keys(v).some(
        (k) => !['operation', 'creditId', 'decorationId'].includes(k),
      )
    )
      return res.status(400).json({ error: 'INVALID_DECORATION' });
    if (v.operation === 'equip')
      return res
        .status(200)
        .json(await service.equip(user.uid, v.decorationId));
    if (
      v.operation === 'claim' &&
      typeof v.creditId === 'string' &&
      typeof v.decorationId === 'string'
    )
      return res
        .status(200)
        .json(await service.claim(user.uid, v.creditId, v.decorationId));
    return res.status(400).json({ error: 'INVALID_DECORATION' });
  } catch (e) {
    if (e instanceof EligibilityError || e instanceof ReferralError)
      return res.status(e.status).json({ error: e.code });
    return res.status(503).json({ error: 'DECORATION_NOT_AVAILABLE' });
  }
}
