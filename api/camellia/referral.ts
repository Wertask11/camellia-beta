import {
  referralDeploymentReady,
  referralIntakeReady,
} from '../../lib/referral/readiness.js';
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
  let ready = false;
  if (referralDeploymentReady() && adminConfigured()) {
    try {
      ready = await referralIntakeReady(serverAdmin().db);
    } catch {
      /* Fail closed without leaking configuration or identities. */
    }
  }
  if (req.method === 'GET')
    return res.status(200).json({
      enabled: ready,
      trialDays: 7,
      referrerMonthlyRewards: 3,
      automaticBilling: false,
    });
  if (req.method !== 'POST' || !adminConfigured())
    return res.status(503).json({ error: 'REFERRAL_NOT_AVAILABLE' });
  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};
  if (
    Buffer.byteLength(JSON.stringify(body)) > 1000 ||
    Object.keys(body).some(
      (k) => !['operation', 'token', 'intent', 'id', 'after'].includes(k),
    )
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
    // Issuing/granting is gated separately. Owners can still revoke old links during an intake stop.
    if (body.operation === 'history' || body.operation === 'revoke') {
      const h = req.headers?.authorization;
      let owner;
      try {
        owner = await auth.verifyIdToken(
          typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7) : '',
          true,
        );
      } catch {
        return res.status(401).json({ error: 'LOGIN_REQUIRED' });
      }
      if (
        owner.firebase?.sign_in_provider === 'anonymous' ||
        (owner.firebase?.sign_in_provider === 'password' &&
          owner.email_verified !== true)
      )
        return res.status(403).json({ error: 'LOGIN_REQUIRED' });
      if (!(await limit.take(owner.uid)))
        throw new ReferralError(429, 'SLOW_DOWN');
      const codes = new ReferralService(db, auth);
      return res
        .status(200)
        .json(
          body.operation === 'history'
            ? await codes.history(owner.uid, body.after)
            : await codes.revokeCode(owner.uid, body.id),
        );
    }
    if (!ready)
      return res.status(503).json({ error: 'REFERRAL_NOT_AVAILABLE' });
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
      let anonymousUid: string | undefined;
      const header = req.headers?.authorization;
      if (typeof header === 'string' && header.startsWith('Bearer ')) {
        let anonymous;
        try {
          anonymous = await auth.verifyIdToken(header.slice(7), true);
        } catch {
          return res.status(401).json({ error: 'LOGIN_REQUIRED' });
        }
        if (anonymous.firebase?.sign_in_provider !== 'anonymous')
          throw new ReferralError(403, 'NEW_REGISTRATION_REQUIRED');
        anonymousUid = anonymous.uid;
      }
      return res
        .status(200)
        .json(await service.capture(body.token, anonymousUid));
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
