import { createHash, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { SERVER_ROOT } from '../server/admin.js';
import { PLUS_PRICE_YEN } from '../membership/model.js';
export type BillingEvent = {
  id: string;
  kind: 'paid' | 'cancel' | 'expired' | 'refund' | 'payment_failed';
  customerId: string;
  priceId: string;
  paymentReceipt: string;
  amount: number;
  currency: 'JPY';
  periodStart: string;
  periodEnd: string;
  occurredAt: string;
  refundedYen?: number;
};
/** Selected processor must verify the raw signed payload and normalize canonical invoice/subscription state. */
export type BillingAdapter = {
  id: string;
  verify: (raw: Uint8Array, signature: string) => Promise<unknown>;
};
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
export const billingCustomerPath = (provider: string, id: string) =>
  `${SERVER_ROOT}/billing_customers/${hash(`${provider}:${id}`)}`;
export const billingSubscriptionPath = (uid: string) =>
  `camellia_users/${uid}/admin/billing_subscription`;
class BillingError extends Error {
  constructor(readonly status: number) {
    super('BILLING_UNAVAILABLE');
  }
}
function normalize(value: unknown): BillingEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BillingError(400);
  const v = value as Record<string, unknown>;
  const allowed = [
    'id',
    'kind',
    'customerId',
    'priceId',
    'paymentReceipt',
    'amount',
    'currency',
    'periodStart',
    'periodEnd',
    'occurredAt',
    'refundedYen',
  ];
  if (
    Object.keys(v).some((k) => !allowed.includes(k)) ||
    !['id', 'customerId', 'priceId', 'paymentReceipt'].every(
      (k) =>
        typeof v[k] === 'string' &&
        /^[-a-zA-Z0-9_]{1,200}$/.test(v[k] as string),
    ) ||
    !['paid', 'cancel', 'expired', 'refund', 'payment_failed'].includes(
      String(v.kind),
    ) ||
    v.currency !== 'JPY' ||
    !Number.isSafeInteger(v.amount) ||
    Number(v.amount) < 0 ||
    Number(v.amount) > 1000000 ||
    !['periodStart', 'periodEnd', 'occurredAt'].every(
      (k) =>
        typeof v[k] === 'string' && Number.isFinite(Date.parse(v[k] as string)),
    ) ||
    Date.parse(String(v.periodEnd)) <= Date.parse(String(v.periodStart))
  )
    throw new BillingError(400);
  if (
    v.kind === 'refund' &&
    (!Number.isSafeInteger(v.refundedYen) ||
      Number(v.refundedYen) < 0 ||
      Number(v.refundedYen) > PLUS_PRICE_YEN)
  )
    throw new BillingError(400);
  if (v.kind !== 'refund' && v.refundedYen !== undefined)
    throw new BillingError(400);
  return {
    id: String(v.id),
    kind: v.kind as BillingEvent['kind'],
    customerId: String(v.customerId),
    priceId: String(v.priceId),
    paymentReceipt: String(v.paymentReceipt),
    amount: Number(v.amount),
    currency: 'JPY',
    periodStart: new Date(String(v.periodStart)).toISOString(),
    periodEnd: new Date(String(v.periodEnd)).toISOString(),
    occurredAt: new Date(String(v.occurredAt)).toISOString(),
    ...(v.kind === 'refund' ? { refundedYen: Number(v.refundedYen) } : {}),
  };
}
export function createBillingWebhook(options: {
  adapter?: BillingAdapter;
  dependencies: () => { db: Firestore; auth: Pick<Auth, 'getUser'> };
  now?: () => number;
}) {
  return async (raw: Uint8Array, signature: string) => {
    if (!options.adapter)
      return { status: 503, body: { error: 'BILLING_NOT_READY' } };
    try {
      if (raw.byteLength > 64000 || !signature || signature.length > 2000)
        throw new BillingError(400);
      let event: BillingEvent;
      try {
        event = normalize(await options.adapter.verify(raw, signature));
      } catch {
        throw new BillingError(400);
      }
      const provider = options.adapter.id;
      if (!/^[a-z0-9-]{1,60}$/.test(provider)) throw new BillingError(503);
      const { db, auth } = options.dependencies(),
        customer = await db
          .doc(billingCustomerPath(provider, event.customerId))
          .get(),
        binding = customer.data();
      if (
        !binding ||
        binding.provider !== provider ||
        typeof binding.uid !== 'string' ||
        !/^[^/\\]{1,128}$/.test(binding.uid) ||
        typeof binding.identityCreatedAt !== 'string'
      )
        throw new BillingError(409);
      const account = await auth.getUser(binding.uid);
      if (
        account.metadata.creationTime !== binding.identityCreatedAt &&
        Date.parse(account.metadata.creationTime) !==
          Date.parse(binding.identityCreatedAt)
      )
        throw new BillingError(409);
      const owner = hash(binding.uid),
        eventRef = db.doc(
          `${SERVER_ROOT}/billing_events/${hash(`${provider}:${event.id}`)}`,
        ),
        invoiceRef = db.doc(
          `${SERVER_ROOT}/billing_receipts/${hash(`${provider}:${event.paymentReceipt}`)}`,
        ),
        subRef = db.doc(billingSubscriptionPath(binding.uid)),
        legacyRef = db.doc(`camellia_users/${binding.uid}/admin/subscription`),
        digest = hash(JSON.stringify(event)),
        now = options.now?.() ?? Date.now();
      const result = await db.runTransaction(async (tx) => {
        const [cfg, oldEvent, invoice, subscription, legacy] =
            await Promise.all([
              tx.get(db.doc(`${SERVER_ROOT}/config/billing`)),
              tx.get(eventRef),
              tx.get(invoiceRef),
              tx.get(subRef),
              tx.get(legacyRef),
            ]),
          config = cfg.data(),
          receipt = invoice.data(),
          sub = subscription.data();
        if (
          config?.approved !== true ||
          config.enabled !== true ||
          config.provider !== provider ||
          config.priceYen !== PLUS_PRICE_YEN ||
          config.currency !== 'JPY' ||
          config.interval !== 'month' ||
          typeof config.approvedBy !== 'string' ||
          !config.approvedBy ||
          !Number.isFinite(Date.parse(config.approvedAt)) ||
          typeof config.monthlyPriceId !== 'string' ||
          config.monthlyPriceId !== event.priceId
        )
          throw new BillingError(503);
        if (oldEvent.exists) {
          if (oldEvent.data()?.digest !== digest) throw new BillingError(409);
          return { accepted: true, duplicate: true };
        }
        if (receipt && receipt.owner !== owner) throw new BillingError(409);
        let effect = 'recorded';
        if (event.kind === 'paid') {
          if (
            event.amount !== PLUS_PRICE_YEN ||
            Date.parse(event.periodEnd) <= Date.parse(event.occurredAt)
          )
            throw new BillingError(400);
          if (Number(receipt?.refundedYen ?? 0) >= PLUS_PRICE_YEN)
            effect = 'already_refunded';
          else if (
            sub &&
            Date.parse(sub.expiresAt) > Date.parse(event.periodEnd)
          )
            effect = 'older_period';
          else {
            tx.set(
              invoiceRef,
              {
                owner,
                provider,
                amount: PLUS_PRICE_YEN,
                currency: 'JPY',
                periodStart: event.periodStart,
                periodEnd: event.periodEnd,
                refundedYen: receipt?.refundedYen ?? 0,
                verifiedAt: new Date(now).toISOString(),
                analyticsEnqueued: true,
              },
              { merge: true },
            );
            if (receipt?.analyticsEnqueued !== true)
              tx.create(
                db.doc(
                  `${SERVER_ROOT}/billing_analytics_outbox/${hash(`${provider}:${event.paymentReceipt}`)}`,
                ),
                {
                  event: 'plus_complete',
                  distinctId: `camellia_${binding.uid}`,
                  insertId: randomUUID(),
                  properties: { currency: 'JPY', amount: PLUS_PRICE_YEN },
                  timestamp: event.occurredAt,
                  status: 'pending',
                  createdAt: new Date(now),
                },
              );
            tx.set(subRef, {
              plan: 'plus',
              source: 'verified_payment',
              status: 'active',
              amount: PLUS_PRICE_YEN,
              currency: 'JPY',
              paymentReceipt: event.paymentReceipt,
              expiresAt: event.periodEnd,
              periodStart: event.periodStart,
              cancelAtPeriodEnd:
                sub?.paymentReceipt === event.paymentReceipt &&
                sub.cancelAtPeriodEnd === true,
              verifiedAt: new Date(now).toISOString(),
            });
            effect = 'paid_period_recorded';
          }
        } else if (event.kind === 'refund') {
          const refundedYen = Math.max(
            Number(receipt?.refundedYen ?? 0),
            event.refundedYen!,
          );
          tx.set(
            invoiceRef,
            {
              owner,
              provider,
              refundedYen,
              refundReviewRequired:
                refundedYen > 0 && refundedYen < PLUS_PRICE_YEN,
            },
            { merge: true },
          );
          if (
            legacy.data()?.source === 'verified_payment' &&
            legacy.data()?.paymentReceipt === event.paymentReceipt &&
            refundedYen >= PLUS_PRICE_YEN
          )
            tx.update(legacyRef, { status: 'refunded' });
          if (
            sub?.paymentReceipt === event.paymentReceipt &&
            refundedYen >= PLUS_PRICE_YEN
          ) {
            tx.update(subRef, { status: 'refunded' });
            effect = 'current_payment_refunded';
          } else
            effect =
              refundedYen < PLUS_PRICE_YEN
                ? 'partial_refund_review'
                : 'other_payment_refunded';
        } else if (
          event.kind === 'cancel' &&
          sub?.paymentReceipt === event.paymentReceipt
        ) {
          tx.update(subRef, { cancelAtPeriodEnd: true });
          effect = 'paid_rights_preserved';
        } else if (
          event.kind === 'expired' &&
          sub?.paymentReceipt === event.paymentReceipt &&
          Date.parse(sub.expiresAt) <= now
        ) {
          tx.update(subRef, { status: 'expired' });
          effect = 'expired';
        }
        // Failed renewal never grants Plus and never removes a still-paid period.
        tx.create(eventRef, {
          owner,
          provider,
          kind: event.kind,
          digest,
          effect,
          createdAt: new Date(now),
          occurredAt: event.occurredAt,
        });
        return { accepted: true, duplicate: false, effect };
      });
      return { status: 200, body: result };
    } catch (error) {
      console.warn('camellia_billing_webhook_unavailable', {
        status: error instanceof BillingError ? error.status : 503,
        stage: 'verification_or_storage',
      });
      return {
        status: error instanceof BillingError ? error.status : 503,
        body: { error: 'BILLING_UNAVAILABLE' },
      };
    }
  };
}
