import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { SERVER_ROOT } from '../server/admin.js';
import {
  estimateAttempt,
  type ProviderAttempt,
} from '../server/ai-observation.js';
import { ReferralService } from './service.js';
/** Dedicated, explicitly requested trial extension only. Never substitutes for the existing Free lane. */
export async function prepareTrialGeneration(options: {
  db: Firestore;
  auth: Pick<Auth, 'getUser'>;
  uid: string;
  requestId: string;
  models: string[];
  countInput: (model: string) => Promise<number>;
}) {
  const config = (
    await options.db.doc(`${SERVER_ROOT}/config/ai_observation`).get()
  ).data();
  if (
    config?.approved !== true ||
    config.trialGenerationApproved !== true ||
    !Number.isSafeInteger(config.maxTrialInputTokens) ||
    config.maxTrialInputTokens <= 0
  )
    throw new Error('TRIAL_AI_NOT_CONFIGURED');
  const models = [...new Set(options.models.filter(Boolean))];
  if (!models.length || models.length > 2)
    throw new Error('TRIAL_AI_NOT_CONFIGURED');
  let upperCost = 0;
  for (const model of models) {
    const input = await options.countInput(model);
    if (
      !Number.isSafeInteger(input) ||
      input < 0 ||
      input > config.maxTrialInputTokens
    )
      throw new Error('TRIAL_AI_INPUT_LIMIT');
    const cap = model.includes('flash-lite') ? 512 : 2048;
    // Conservative bound: charge the whole output cap at both output and thinking rates; assume no cache discount.
    const estimate = estimateAttempt(
      { input, output: cap, thinking: cap, cached: 0, total: null },
      config.pricing?.[model],
    );
    if (estimate.status !== 'estimate')
      throw new Error('TRIAL_AI_NOT_CONFIGURED');
    upperCost += estimate.amountYen;
  }
  const service = new ReferralService(options.db, options.auth),
    reserve = await service.reserveTrialAi(
      options.uid,
      options.requestId,
      Math.max(1, Math.ceil(upperCost)),
    );
  if (reserve.reused)
    throw Object.assign(new Error('DUPLICATE_REQUEST'), {
      code: 'DUPLICATE_REQUEST',
    });
  let dispatched = false;
  const estimates: number[] = [];
  let complete = true;
  return {
    async beforeDispatch() {
      await service.dispatchTrialAi(options.uid, options.requestId);
      dispatched = true;
    },
    observe(attempt: ProviderAttempt) {
      const estimate = estimateAttempt(
        attempt.usage,
        config.pricing?.[attempt.model],
      );
      if (estimate.status === 'estimate') estimates.push(estimate.amountYen);
      else complete = false;
    },
    async finish() {
      if (!dispatched)
        return service.releaseTrialAi(options.uid, options.requestId);
      if (complete && estimates.length)
        return service.settleTrialAi(
          options.uid,
          options.requestId,
          estimates.reduce((a, b) => a + b, 0),
        );
      return service.holdTrialAi(options.uid, options.requestId);
    },
  };
}
