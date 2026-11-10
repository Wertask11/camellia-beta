/** No campaign is launched by this implementation. Cost/quota and signup hooks need a separately reviewed release. */
export const REFERRAL_INTEGRATION_READY = false;
export const REFERRAL_TRIAL_DAYS = 7;
export const REFERRER_MONTHLY_REWARDS = 3;
export type ReferralConfig = {
  campaignId: string;
  accepting: boolean;
  startsAt: string;
  endsAt: string;
  monthlyBudgetYen: number;
  reservePerTrialYen: number;
  trialAiRequests: number;
  newcomerAfterCap: 'grant' | 'decline';
  overlapPolicy: 'reject_any_prior' | 'reject_active_only';
  decorationIds: string[];
  approvedThresholds: { value: number; retention: number; cost: number };
  approvals: {
    formalRelease: boolean;
    value: boolean;
    retention: boolean;
    cost: boolean;
    privacy: boolean;
    antiAbuse: boolean;
  };
  checkedAt: string;
};
export function referralConfiguration(value: unknown): {
  config?: ReferralConfig;
  missing: string[];
} {
  const v =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {},
    missing: string[] = [];
  const validId = (x: unknown) =>
      typeof x === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(x),
    date = (x: unknown) =>
      typeof x === 'string' &&
      /(Z|[+-]\d\d:\d\d)$/.test(x) &&
      Number.isFinite(Date.parse(x));
  if (!validId(v.campaignId)) missing.push('campaignId');
  if (typeof v.accepting !== 'boolean') missing.push('accepting');
  if (
    !date(v.startsAt) ||
    !date(v.endsAt) ||
    Date.parse(String(v.endsAt)) <= Date.parse(String(v.startsAt))
  )
    missing.push('period');
  for (const key of [
    'monthlyBudgetYen',
    'reservePerTrialYen',
    'trialAiRequests',
  ])
    if (!Number.isSafeInteger(v[key]) || Number(v[key]) <= 0) missing.push(key);
  if (!['grant', 'decline'].includes(String(v.newcomerAfterCap)))
    missing.push('newcomerAfterCap');
  if (
    !['reject_any_prior', 'reject_active_only'].includes(
      String(v.overlapPolicy),
    )
  )
    missing.push('overlapPolicy');
  if (
    !Array.isArray(v.decorationIds) ||
    !v.decorationIds.length ||
    v.decorationIds.some((x) => !validId(x)) ||
    new Set(v.decorationIds).size !== v.decorationIds.length
  )
    missing.push('decorationIds');
  const thresholds = v.approvedThresholds as
    | Record<string, unknown>
    | undefined;
  for (const key of ['value', 'retention', 'cost'])
    if (
      !thresholds ||
      typeof thresholds[key] !== 'number' ||
      !Number.isFinite(thresholds[key]) ||
      Number(thresholds[key]) < 0
    )
      missing.push(`threshold.${key}`);
  const approvals = v.approvals as Record<string, unknown> | undefined;
  for (const key of [
    'formalRelease',
    'value',
    'retention',
    'cost',
    'privacy',
    'antiAbuse',
  ])
    if (approvals?.[key] !== true) missing.push(`approval.${key}`);
  if (!date(v.checkedAt)) missing.push('checkedAt');
  return missing.length
    ? { missing }
    : { missing, config: v as unknown as ReferralConfig };
}
