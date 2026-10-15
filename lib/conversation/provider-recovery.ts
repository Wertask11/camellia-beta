/** Two bounded Google-model attempts; never retry invalid keys, quota or safety blocks. */
export async function generateWithModelRecovery<T>(options: {
  primary: string;
  fallback: string;
  request: (model: string, signal: AbortSignal) => Promise<T>;
  signal: AbortSignal;
  attemptTimeoutMs?: number;
  onFailure?: (metadata: { attempt: number; model: string; status?: number; timedOut: boolean }) => void;
}) {
  const models = [...new Set([options.primary, options.fallback].filter(Boolean))];
  for (let index = 0; index < models.length; index += 1) {
    options.signal.throwIfAborted();
    const attemptSignal = AbortSignal.any([options.signal, AbortSignal.timeout(options.attemptTimeoutMs ?? 14_000)]);
    try {
      return await options.request(models[index], attemptSignal);
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : undefined;
      const attemptTimedOut = attemptSignal.aborted && !options.signal.aborted;
      options.onFailure?.({ attempt: index + 1, model: models[index], status, timedOut: attemptTimedOut });
      if (options.signal.aborted || index === models.length - 1 || (!attemptTimedOut && ![500, 502, 503, 504].includes(status ?? 0))) throw error;
    }
  }
  throw new Error('GENERATION_MODEL_NOT_CONFIGURED');
}

/** Per-instance cooldown avoids re-probing an unavailable model on every chat turn. */
export function createModelCooldown(options: { now?: () => number; cooldownMs?: number } = {}) {
  const unavailableUntil = new Map<string, number>();
  const now = options.now ?? Date.now;
  return {
    select(primary: string, fallback: string) {
      if (fallback && fallback !== primary && (unavailableUntil.get(primary) ?? 0) > now()) return { primary: fallback, fallback: '' };
      return { primary, fallback };
    },
    failed(metadata: { model: string; status?: number; timedOut: boolean }) {
      if (metadata.timedOut || [500, 502, 503, 504].includes(metadata.status ?? 0)) unavailableUntil.set(metadata.model, now() + (options.cooldownMs ?? 120_000));
    },
    succeeded(model: string) { unavailableUntil.delete(model); },
  };
}
