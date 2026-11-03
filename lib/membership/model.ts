export const PLUS_PRICE_YEN=500;
/** Owner-approved release policy: no checkout, no issued links or public link reads until billing setup. */
export const COMMERCE_PREVIEW_ONLY=true;
export type Membership={plan:'free'|'plus';trial:boolean;paid:boolean;expiresAt?:string;sharingReady?:boolean;checkoutReady:false;priceYen:500};
export function membershipFromRecord(value:Record<string,unknown>|undefined,now=Date.now()):Membership{
 const base:Membership={plan:'free',trial:false,paid:false,checkoutReady:false,priceYen:500};
 if(!value||value.plan!=='plus'||typeof value.expiresAt!=='string'||!Number.isFinite(Date.parse(value.expiresAt))||Date.parse(value.expiresAt)<=now)return base;
 const paid=value.source==='verified_payment'&&value.status==='active'&&value.amount===PLUS_PRICE_YEN&&value.currency==='JPY'&&typeof value.paymentReceipt==='string'&&value.paymentReceipt.length>0;
 const trial=value.source==='operator_trial'&&value.status==='trialing';
 return paid||trial?{...base,plan:'plus',paid,trial,expiresAt:value.expiresAt}:base;
}
