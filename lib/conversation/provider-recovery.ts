const transientNetworkCodes = new Set(['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED', 'ENETUNREACH', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_SOCKET']);
const rejectedCodes = new Set<unknown>(['STREAM_INTERRUPTED', 'SAFETY_BLOCK', 'RESOURCE_EXHAUSTED', 'INVALID_ARGUMENT', 'UNAUTHENTICATED', 'PERMISSION_DENIED', 'API_KEY_INVALID', 400, 401, 403, 429]);

/** Recognize transport errors without inspecting or logging exception messages. */
export function isTransientNetworkError(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth += 1) {
    const value = current as { code?: unknown; cause?: unknown };
    if (typeof value.code === 'string' && transientNetworkCodes.has(value.code)) return true;
    current = value.cause;
  }
  return false;
}

function recoveryReason(error: unknown, attemptTimedOut: boolean) {
  const value = error && typeof error === 'object' ? error as { status?: unknown; code?: unknown } : {};
  const status = typeof value.status === 'number' ? value.status : 0;
  // A transport cause must never override explicit policy, key or quota rejection.
  if (rejectedCodes.has(value.code) || [400, 401, 403, 429].includes(status)) return 'non_retryable';
  if (attemptTimedOut) return 'timeout';
  if ([500, 502, 503, 504].includes(status)) return 'server_error';
  if (value.code === 'INVALID_RESPONSE') return 'invalid_response';
  return isTransientNetworkError(error) ? 'network' : 'non_retryable';
}

/** At most two configured-model attempts within one deadline; no browser replay or extra rate-limit reservation. */
export async function generateWithModelRecovery<T>(options: {
  primary: string;
  fallback: string;
  request: (model: string, signal: AbortSignal) => Promise<T>;
  signal: AbortSignal;
  attemptTimeoutMs?: number;
  onFailure?: (metadata: { attempt: number; model: string; status?: number; timedOut: boolean; reason: ReturnType<typeof recoveryReason> }) => void;
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
      const reason = recoveryReason(error, attemptTimedOut);
      options.onFailure?.({ attempt: index + 1, model: models[index], status, timedOut: attemptTimedOut, reason });
      if (options.signal.aborted || index === models.length - 1 || reason === 'non_retryable') throw error;
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
