import { REFERRAL_INTEGRATION_READY } from '../../lib/referral/config.js';
import { serverAdmin, adminConfigured } from '../../lib/server/admin.js';
import {
  requireEligibleUser,
  EligibilityError,
} from '../../lib/server/eligibility.js';
import { createSharedRateLimiter } from '../../lib/server/shared-limit.js';
import { ReferralRegistration } from '../../lib/referral/registration.js';
import { ReferralService, ReferralError } from '../../lib/referral/service.js';
type Req = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};
export default async function referral(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method === 'GET')
    return res
      .status(200)
      .json({
        enabled: REFERRAL_INTEGRATION_READY,
        trialDays: 7,
        referrerMonthlyRewards: 3,
        automaticBilling: false,
      });
  if (
    req.method !== 'POST' ||
    !REFERRAL_INTEGRATION_READY ||
    !adminConfigured()
  )
    return res.status(503).json({ error: 'REFERRAL_NOT_AVAILABLE' });
  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};
  if (
    Buffer.byteLength(JSON.stringify(body)) > 1000 ||
    Object.keys(body).some((k) => !['operation', 'token', 'intent'].includes(k))
  )
    return res.status(400).json({ error: 'INVALID_REFERRAL' });
  try {
    const { db, auth } = serverAdmin(),
      service = new ReferralRegistration(db, auth),
      limit = createSharedRateLimiter(
        db,
        {},
        Date.now,
        'referral_rate_windows',
      );
    if (body.operation === 'capture') {
      const forwarded = req.headers?.['x-vercel-forwarded-for'];
      if (
        !(await limit.take(
          typeof forwarded === 'string'
            ? forwarded.split(',')[0]
            : 'unidentified',
        ))
      )
        throw new ReferralError(429, 'SLOW_DOWN');
      return res.status(200).json(await service.capture(body.token));
    }
    const header = req.headers?.authorization,
      user = await requireEligibleUser(
        typeof header === 'string' && header.startsWith('Bearer ')
          ? header.slice(7)
          : '',
        { db, auth },
      );
    if (!(await limit.take(user.uid)))
      throw new ReferralError(429, 'SLOW_DOWN');
    if (body.operation === 'issue')
      return res
        .status(200)
        .json(await new ReferralService(db, auth).issue(user.uid));
    if (body.operation === 'complete')
      return res
        .status(200)
        .json(await service.complete(user.uid, body.token, body.intent));
    return res.status(400).json({ error: 'INVALID_REFERRAL' });
  } catch (e) {
    if (e instanceof ReferralError || e instanceof EligibilityError)
      return res.status(e.status).json({ error: e.code });
    return res.status(503).json({ error: 'REFERRAL_NOT_AVAILABLE' });
  }
}
