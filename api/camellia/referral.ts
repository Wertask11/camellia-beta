import { REFERRAL_INTEGRATION_READY } from '../../lib/referral/config.js';
type Req = { method?: string };
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};
/** No issuance/grant endpoint exposed while operational policy and integrations remain incomplete. */
export default function referral(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'GET')
    return res
      .status(200)
      .json({
        enabled: REFERRAL_INTEGRATION_READY,
        trialDays: 7,
        referrerMonthlyRewards: 3,
        automaticBilling: false,
      });
  return res.status(503).json({ error: 'REFERRAL_NOT_AVAILABLE' });
}
