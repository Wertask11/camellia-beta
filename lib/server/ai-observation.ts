import { createHash } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { SERVER_ROOT } from './admin.js';
export type ProviderUsage = {
  input: number | null;
  output: number | null;
  thinking: number | null;
  cached: number | null;
  total: number | null;
};
export type ProviderAttempt = {
  model: string;
  attempt: number;
  outcome: 'success' | 'error' | 'aborted' | 'safety_block';
  durationMs: number;
  usage: ProviderUsage;
};
const counter = (x: unknown): number | null =>
  Number.isSafeInteger(x) && Number(x) >= 0 && Number(x) <= 10000000
    ? Number(x)
    : null;
export function readProviderUsage(value: unknown): ProviderUsage {
  const v =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  return {
    input: counter(v.promptTokenCount),
    output: counter(v.candidatesTokenCount),
    thinking: counter(v.thoughtsTokenCount),
    cached: counter(v.cachedContentTokenCount),
    total: counter(v.totalTokenCount),
  };
}
/** Streaming metadata is cumulative. Never add repeated totals from successive chunks. */
export function mergeProviderUsage(
  a: ProviderUsage,
  b: ProviderUsage,
): ProviderUsage {
  return Object.fromEntries(
    Object.keys(a).map((k) => [
      k,
      b[k as keyof ProviderUsage] === null
        ? a[k as keyof ProviderUsage]
        : Math.max(
            a[k as keyof ProviderUsage] ?? 0,
            b[k as keyof ProviderUsage]!,
          ),
    ]),
  ) as ProviderUsage;
}
export function estimateAttempt(usage: ProviderUsage, value: unknown) {
  const v =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  if (
    v.approved !== true ||
    v.currency !== 'JPY' ||
    typeof v.sourceUrl !== 'string' ||
    !v.sourceUrl.startsWith('https://') ||
    typeof v.checkedAt !== 'string' ||
    !Number.isFinite(Date.parse(v.checkedAt)) ||
    ![
      'inputPerMillion',
      'outputPerMillion',
      'thinkingPerMillion',
      'cachedPerMillion',
    ].every(
      (k) =>
        typeof v[k] === 'number' && Number.isFinite(v[k]) && Number(v[k]) >= 0,
    )
  )
    return {
      status: 'pricing_not_configured' as const,
      invoiceVerified: false,
    };
  if (
    [usage.input, usage.output, usage.thinking, usage.cached].some(
      (n) => n === null,
    ) ||
    usage.cached! > usage.input!
  )
    return { status: 'usage_incomplete' as const, invoiceVerified: false };
  const amountYen =
    ((usage.input! - usage.cached!) * Number(v.inputPerMillion) +
      usage.cached! * Number(v.cachedPerMillion) +
      usage.output! * Number(v.outputPerMillion) +
      usage.thinking! * Number(v.thinkingPerMillion)) /
    1000000;
  if (!Number.isFinite(amountYen))
    return {
      status: 'pricing_not_configured' as const,
      invoiceVerified: false,
    };
  return { status: 'estimate' as const, amountYen, invoiceVerified: false };
}
const key = (v: string) => createHash('sha256').update(v).digest('hex');
export const validAiRequestId = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
/** No prompt/reply/result caching. A repeated request ID is rejected while its operational receipt is retained. */
export async function claimAiRequest(
  db: Firestore,
  uid: string,
  requestId: string,
  now = Date.now(),
) {
  if (!validAiRequestId(requestId) || !uid)
    throw new Error('INVALID_REQUEST_ID');
  const ref = db.doc(
    `${SERVER_ROOT}/ai_request_receipts/${key(`${uid}:${requestId}`)}`,
  );
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists)
      throw Object.assign(new Error('DUPLICATE_REQUEST'), {
        code: 'DUPLICATE_REQUEST',
      });
    tx.create(ref, {
      owner: key(uid),
      state: 'started',
      createdAt: new Date(now),
      expiresAt: new Date(now + 40000),
    });
  });
  return {
    finish: async (state: 'success' | 'error' | 'aborted') => {
      await ref.update({ state, finishedAt: new Date() });
    },
  };
}
/** Explicit protected retention approval enables storage. Free remains usable if observation is unavailable. */
export async function recordProviderAttempt(
  db: Firestore,
  uid: string,
  requestId: string,
  observation: ProviderAttempt,
  now = Date.now(),
) {
  if (
    !validAiRequestId(requestId) ||
    !/^gemini-[a-zA-Z0-9._-]{1,100}$/.test(observation.model) ||
    !Number.isSafeInteger(observation.attempt) ||
    observation.attempt < 1 ||
    observation.attempt > 2
  )
    throw new Error('INVALID_OBSERVATION');
  if (
    !['success', 'error', 'aborted', 'safety_block'].includes(
      observation.outcome,
    ) ||
    !Number.isSafeInteger(observation.durationMs) ||
    observation.durationMs < 0 ||
    observation.durationMs > 120000 ||
    !observation.usage ||
    !['input', 'output', 'thinking', 'cached', 'total'].every(
      (k) =>
        observation.usage[k as keyof ProviderUsage] === null ||
        counter(observation.usage[k as keyof ProviderUsage]) !== null,
    )
  )
    throw new Error('INVALID_OBSERVATION');
  const usage = Object.fromEntries(
    ['input', 'output', 'thinking', 'cached', 'total'].map((k) => [
      k,
      observation.usage[k as keyof ProviderUsage],
    ]),
  ) as ProviderUsage;
  const safe = {
    model: observation.model,
    attempt: observation.attempt,
    outcome: observation.outcome,
    durationMs: observation.durationMs,
    usage,
  };
  const owner = key(uid),
    id = key(`${uid}:${requestId}:${observation.attempt}`),
    day = new Date(now + 9 * 3600000).toISOString().slice(0, 10);
  return db.runTransaction(async (tx) => {
    const config = (
      await tx.get(db.doc(`${SERVER_ROOT}/config/ai_observation`))
    ).data();
    if (
      config?.approved !== true ||
      typeof config.approvedBy !== 'string' ||
      !config.approvedBy ||
      !Number.isFinite(Date.parse(config.approvedAt)) ||
      !Number.isSafeInteger(config.retentionMs) ||
      config.retentionMs <= 0
    )
      return { recorded: false, reason: 'observation_not_approved' };
    const ref = db.doc(`${SERVER_ROOT}/ai_usage_receipts/${id}`),
      old = await tx.get(ref);
    if (old.exists) return { recorded: false, reason: 'duplicate' };
    const estimate = estimateAttempt(
      usage,
      config.pricing?.[observation.model],
    );
    tx.create(ref, {
      owner,
      ...safe,
      estimate,
      createdAt: new Date(now),
      expiresAt: new Date(now + config.retentionMs),
    });
    tx.set(
      db.doc(`${SERVER_ROOT}/ai_attempt_days/${day}_${key(observation.model)}`),
      {
        date: day,
        model: observation.model,
        attempts: FieldValue.increment(1),
        [observation.outcome]: FieldValue.increment(1),
        incomplete: FieldValue.increment(
          Object.values(usage).some((v) => v === null) ? 1 : 0,
        ),
        ...Object.fromEntries(
          Object.entries(usage)
            .filter(([, v]) => v !== null)
            .map(([k, v]) => [`${k}Tokens`, FieldValue.increment(v!)]),
        ),
        ...(estimate.status === 'estimate'
          ? { estimatedYen: FieldValue.increment(estimate.amountYen) }
          : {}),
        invoiceVerified: false,
      },
      { merge: true },
    );
    return { recorded: true, estimate };
  });
}
