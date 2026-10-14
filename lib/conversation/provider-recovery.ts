/** Two bounded Google-model attempts; never retry invalid keys, quota or safety blocks. */
export async function generateWithModelRecovery<T>(options: {
  primary: string;
  fallback: string;
  request: (model: string, signal: AbortSignal) => Promise<T>;
  signal: AbortSignal;
  attemptTimeoutMs?: number;
  onFailure?: (metadata: { attempt: number; status?: number }) => void;
}) {
  const models = [...new Set([options.primary, options.fallback].filter(Boolean))];
  for (let index = 0; index < models.length; index += 1) {
    options.signal.throwIfAborted();
    try {
      return await options.request(models[index], AbortSignal.any([options.signal, AbortSignal.timeout(options.attemptTimeoutMs ?? 8000)]));
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : undefined;
      options.onFailure?.({ attempt: index + 1, status });
      if (options.signal.aborted || index === models.length - 1 || ![500, 502, 503, 504].includes(status ?? 0)) throw error;
    }
  }
  throw new Error('GENERATION_MODEL_NOT_CONFIGURED');
}
