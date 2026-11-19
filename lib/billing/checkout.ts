import { createHash, randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import {FieldValue,type Firestore } from 'firebase-admin/firestore';
import{approvedRetention}from'../server/retention-policy.js';
import { SERVER_ROOT } from '../server/admin.js';
import { billingCustomerPath } from './webhook.js';
import { stripePriceValid, type StripeMode } from './stripe.js';
import { billingDisclosure } from './disclosure.js';
import { memberStatus } from '../membership/server.js';
export class CheckoutError extends Error { constructor(readonly status: number, readonly code: string) { super(code); } }
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const ownerPath = (uid: string) => `${SERVER_ROOT}/billing_owners/${hash(uid)}`;
export type CheckoutConfig = { mode: StripeMode; priceId: string; origin: string; checkoutEnabled: boolean; termsVersion: string; disclosureVersion: string; portalConfiguration: string };
export function checkoutConfiguration(value: unknown, mode: StripeMode): CheckoutConfig | undefined {
 const v = value as Record<string, unknown> | undefined;
 if (!v || !billingDisclosure(v.disclosure) || billingDisclosure(v.disclosure)?.version !== v.disclosureVersion || v.approved !== true || v.enabled !== true || v.provider !== 'stripe' || v.mode !== mode || v.priceYen !== 500 || v.currency !== 'JPY' || v.interval !== 'month' || typeof v.approvedBy !== 'string' || !v.approvedBy || !Number.isFinite(Date.parse(String(v.approvedAt))) || v.disclosuresApproved !== true) return;
 if (!['monthlyPriceId','termsVersion','disclosureVersion','portalConfiguration'].every(k => typeof v[k] === 'string' && /^[-a-zA-Z0-9_.]{1,200}$/.test(v[k] as string))) return;
 try { const u = new URL(String(v.checkoutOrigin)); if (u.protocol !== 'https:' || u.username || u.password || u.port || u.origin !== v.checkoutOrigin) return; } catch { return; }
 return { mode, priceId: String(v.monthlyPriceId), origin: String(v.checkoutOrigin), checkoutEnabled: v.checkoutEnabled === true, termsVersion: String(v.termsVersion), disclosureVersion: String(v.disclosureVersion), portalConfiguration: String(v.portalConfiguration) };
}
export function stripeHostedUrl(value: unknown, kind: 'checkout' | 'portal') {
 if (typeof value !== 'string') throw new CheckoutError(503, 'BILLING_UNAVAILABLE');
 const u = new URL(value);
 if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hostname !== (kind === 'checkout' ? 'checkout.stripe.com' : 'billing.stripe.com')) throw new CheckoutError(503, 'BILLING_UNAVAILABLE');
 return value;
}
/** Protected intent and provider idempotency keys survive network failures and concurrent taps. */
export class StripeCheckoutService {
 constructor(private db: Firestore, private stripe: Stripe, private mode: StripeMode, private now = Date.now) {}
 async configuration() { return checkoutConfiguration((await this.db.doc(`${SERVER_ROOT}/config/billing`).get()).data(), this.mode); }
 async intakeReady(cfg:CheckoutConfig|undefined){if(!cfg?.checkoutEnabled)return false;const config=(await this.db.doc(`${SERVER_ROOT}/config/billing`).get()).data();return config?.benefitsApproved===true&&config?.conversationPolicyReviewed===true&&approvedRetention((await this.db.doc(`${SERVER_ROOT}/config/retention`).get()).data(),['billing_customers','billing_checkouts','billing_events','billing_receipts','billing_analytics_outbox']);}
 async status(uid: string, identityCreatedAt: string) {
  const cfg = await this.configuration();
  const [owner, pending] = await Promise.all([this.db.doc(ownerPath(uid)).get(), this.db.doc(`${SERVER_ROOT}/billing_checkouts/${hash(`${uid}:${identityCreatedAt}`)}`).get()]);
  const customer = owner.data();
  if (customer && customer.identityCreatedAt !== identityCreatedAt) throw new CheckoutError(409, 'BILLING_IDENTITY_CONFLICT');
  if (!cfg) return { ready: false, priceYen: 500, customer: typeof customer?.customerId === 'string' };
  const price = await this.stripe.prices.retrieve(cfg.priceId);
  return { ready: await this.intakeReady(cfg) && stripePriceValid(price, cfg.priceId, this.mode), priceYen: 500,
   customer: typeof customer?.customerId === 'string', termsVersion: cfg.termsVersion, disclosureVersion: cfg.disclosureVersion, termsUrl: `${cfg.origin}/terms.html`, disclosureUrl: `${cfg.origin}/billing.html`, ...(pending.data()?.identityCreatedAt === identityCreatedAt && pending.data()!.expiresAt > this.now() ? { pendingRequestId: pending.data()!.requestId } : {}) };
 }
 private async customer(uid: string, identityCreatedAt: string, analyticsProfileId?: string) {
  const ref = this.db.doc(ownerPath(uid)), old = (await ref.get()).data();
  if (old && old.identityCreatedAt !== identityCreatedAt) throw new CheckoutError(409, 'BILLING_IDENTITY_CONFLICT');
  if (typeof old?.customerId === 'string'){
   const profile=await this.db.doc(`camellia_users/${uid}`).get();if(!profile.exists||profile.data()?.personalDeleteInProgress===true)throw new CheckoutError(409,'RECORDS_UNAVAILABLE');
   await this.db.doc(billingCustomerPath('stripe',old.customerId)).set(this.analyticsBinding(analyticsProfileId,uid,profile.createTime?.toMillis()),{merge:true});return old.customerId as string;
  }
  const key = hash(`${uid}:${identityCreatedAt}`);
  // Do not forward email, name, UID, health records or conversation text in Stripe metadata.
  const customer = await this.stripe.customers.create({}, { idempotencyKey: `camellia-customer-${key}` });
  if (customer.livemode !== (this.mode === 'live')) throw new CheckoutError(503, 'BILLING_UNAVAILABLE');
  await this.db.runTransaction(async tx => {
   const [current, profile] = await Promise.all([tx.get(ref), tx.get(this.db.doc(`camellia_users/${uid}`))]);
   if (!profile.exists || profile.data()?.personalDeleteInProgress === true) throw new CheckoutError(409, 'RECORDS_UNAVAILABLE');
   if (current.exists && (current.data()?.customerId !== customer.id || current.data()?.identityCreatedAt !== identityCreatedAt)) throw new CheckoutError(409, 'BILLING_IDENTITY_CONFLICT');
   const binding = { uid, provider: 'stripe', identityCreatedAt, ...this.analyticsBinding(analyticsProfileId,uid,profile.createTime?.toMillis()) };
   tx.set(this.db.doc(billingCustomerPath('stripe', customer.id)), binding, { merge: true });
   tx.set(ref, { customerId: customer.id, identityCreatedAt }, { merge: true });
  });
  return customer.id;
 }
 private analyticsBinding(profileId:unknown,uid:string,epoch?:number){return uuid(profileId)&&profileId!==uid?{analyticsProfileId:profileId,analyticsProfileEpoch:epoch,analyticsConsentFrom:new Date(this.now()).toISOString(),analyticsConsentUntil:new Date(this.now()+45*60000).toISOString()}:{analyticsProfileId:FieldValue.delete(),analyticsProfileEpoch:FieldValue.delete(),analyticsConsentFrom:FieldValue.delete(),analyticsConsentUntil:FieldValue.delete()};}
 async start(uid: string, identityCreatedAt: string, input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CheckoutError(400, 'INVALID_CHECKOUT');
  const v = input as Record<string, unknown>;
  if (Object.keys(v).some(k => !['requestId','termsVersion','disclosureVersion','consent','analyticsProfileId'].includes(k)) || !uuid(v.requestId) || v.consent !== true || v.analyticsProfileId !== undefined && !uuid(v.analyticsProfileId)) throw new CheckoutError(400, 'INVALID_CHECKOUT');
  const cfg = await this.configuration();
  if (!cfg||!await this.intakeReady(cfg)) throw new CheckoutError(503, 'BILLING_NOT_READY');
  if (v.termsVersion !== cfg.termsVersion || v.disclosureVersion !== cfg.disclosureVersion) throw new CheckoutError(409, 'BILLING_TERMS_CHANGED');
  // The overlap/upgrade policy is not decided. Preserve any valid paid/trial right and never charge twice.
  if ((await memberStatus(this.db, uid, this.now())).plan === 'plus') throw new CheckoutError(409, 'EXISTING_PLUS');
  if (!stripePriceValid(await this.stripe.prices.retrieve(cfg.priceId), cfg.priceId, this.mode)) throw new CheckoutError(503, 'BILLING_NOT_READY');
  const customer = await this.customer(uid, identityCreatedAt, v.analyticsProfileId as string | undefined);
  const subscriptions = await this.stripe.subscriptions.list({ customer, status: 'all', limit: 100 });
  if (subscriptions.has_more || subscriptions.data.some(s => !['canceled','incomplete_expired'].includes(s.status))) throw new CheckoutError(409, 'EXISTING_SUBSCRIPTION');
  const ref = this.db.doc(`${SERVER_ROOT}/billing_checkouts/${hash(`${uid}:${identityCreatedAt}`)}`), at = this.now();
  const intent = await this.db.runTransaction(async tx => {
   const [snapshot, profile] = await Promise.all([tx.get(ref), tx.get(this.db.doc(`camellia_users/${uid}`))]);
   if (!profile.exists || profile.data()?.personalDeleteInProgress === true) throw new CheckoutError(409, 'RECORDS_UNAVAILABLE');
   const old = snapshot.data();
   if (old && old.expiresAt > at) {
    if (old.requestId !== v.requestId || old.identityCreatedAt !== identityCreatedAt || old.priceId !== cfg.priceId || old.termsVersion !== cfg.termsVersion || old.disclosureVersion !== cfg.disclosureVersion) throw new CheckoutError(409, 'CHECKOUT_PENDING');
    return old as { id: string; requestId: string; expiresAt: number; url?: string; createdAt: number };
   }
   const next = { id: randomUUID(), requestId: v.requestId as string, identityCreatedAt, priceId: cfg.priceId, expiresAt: at + 45*60000, createdAt: at, status: 'creating', termsVersion: cfg.termsVersion, disclosureVersion: cfg.disclosureVersion };
   tx.set(ref, next); return next;
  });
  if ('url' in intent && intent.url) return { url: stripeHostedUrl(intent.url, 'checkout') };
  if (this.now() - intent.createdAt >= 14*60000) throw new CheckoutError(409, 'CHECKOUT_REVIEW_REQUIRED');
  const session = await this.stripe.checkout.sessions.create({ mode: 'subscription', customer,
   line_items: [{ price: cfg.priceId, quantity: 1 }], client_reference_id: intent.id,
   allowed_payment_method_types: ['card'], allow_promotion_codes: false,
   expires_at: Math.floor(intent.expiresAt/1000), locale: 'ja',
   success_url: `${cfg.origin}/?open=billing&billing=returned`, cancel_url: `${cfg.origin}/?open=billing&billing=cancelled`,
   consent_collection: { terms_of_service: 'required' },
   custom_text: { submit: { message: 'Camellia Plusは月額500円です。毎月自動更新され、解約はMyから行えます。無料体験から自動加入しません。' } },
  }, { idempotencyKey: `camellia-checkout-${intent.id}` });
  const url = stripeHostedUrl(session.url, 'checkout');
  if (session.livemode !== (this.mode === 'live') || session.mode !== 'subscription' || session.customer !== customer || session.client_reference_id !== intent.id) throw new CheckoutError(503, 'BILLING_UNAVAILABLE');
  await this.db.runTransaction(async tx => {
   const current = await tx.get(ref);
   if (current.data()?.id !== intent.id) throw new CheckoutError(409, 'CHECKOUT_REVIEW_REQUIRED');
   tx.update(ref, { status: 'open', sessionId: session.id, url });
  });
  // Returning a URL is not a payment or an entitlement grant.
  return { url };
 }
 async portal(uid: string, identityCreatedAt: string) {
  const cfg = await this.configuration(), owner = (await this.db.doc(ownerPath(uid)).get()).data();
  if (!cfg || !owner?.customerId || owner.identityCreatedAt !== identityCreatedAt) throw new CheckoutError(409, 'BILLING_IDENTITY_CONFLICT');
  // Approved configuration may allow cancellation/payment methods/invoice history, never arbitrary paid plan changes.
  const configuration = await this.stripe.billingPortal.configurations.retrieve(cfg.portalConfiguration);
  if (!configuration.active || configuration.livemode !== (this.mode === 'live') || configuration.features.subscription_update.enabled || !configuration.features.subscription_cancel.enabled || configuration.features.subscription_cancel.mode !== 'at_period_end') throw new CheckoutError(503, 'BILLING_NOT_READY');
  const session = await this.stripe.billingPortal.sessions.create({ customer: owner.customerId, configuration: cfg.portalConfiguration, return_url: `${cfg.origin}/?open=billing` });
  return { url: stripeHostedUrl(session.url, 'portal') };
 }
 async history(uid: string, identityCreatedAt: string) {
  const owner = (await this.db.doc(ownerPath(uid)).get()).data();
  if (!owner) return { invoices: [], more: false };
  if (owner.identityCreatedAt !== identityCreatedAt) throw new CheckoutError(409, 'BILLING_IDENTITY_CONFLICT');
  const invoices = await this.stripe.invoices.list({ customer: owner.customerId, limit: 12 });
  return { invoices: invoices.data.map(i => ({ status: i.status, amountPaidYen: i.currency === 'jpy' ? i.amount_paid : null, createdAt: new Date(i.created*1000).toISOString() })), more: invoices.has_more };
 }
}
