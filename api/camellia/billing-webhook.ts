/** No processor is contracted/configured. Never accept a payment assertion or grant Plus here. */
type Res = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (v: unknown) => void };
};
export default function billingWebhook(_req: unknown, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(503).json({ error: 'BILLING_NOT_READY' });
}
