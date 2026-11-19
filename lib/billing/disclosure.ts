/** Operator-approved public seller information only. Never forward the rest of billing configuration. */
export function billingDisclosure(value: unknown) {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return;
 const v = value as Record<string, unknown>;
 if (v.approved !== true || typeof v.approvedBy !== 'string' || !v.approvedBy || !Number.isFinite(Date.parse(String(v.approvedAt)))) return;
 const keys = ['seller','representative','address','contact','paymentTiming','cancellation','refund'] as const;
 if (!keys.every(k => typeof v[k] === 'string' && (v[k] as string).trim().length >= 2 && (v[k] as string).length <= 2000)) return;
 if (typeof v.version !== 'string' || !/^[-a-zA-Z0-9_.]{1,200}$/.test(v.version)) return;
 return { version: v.version, priceYen: 500 as const, interval: 'month' as const, ...Object.fromEntries(keys.map(k => [k, v[k]])) };
}
