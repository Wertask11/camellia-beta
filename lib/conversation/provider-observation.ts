import {
  readProviderUsage,
  mergeProviderUsage,
  type ProviderUsage,
  type ProviderAttempt,
} from '../server/ai-observation.js';
/** Observe only numeric SDK usage metadata, including on blocked/partial/failed streams. */
export async function observeProviderAttempt<T>(options: {
  model: string;
  attempt: number;
  signal: AbortSignal;
  run: (report: (metadata: unknown) => void) => Promise<T>;
  record: (value: ProviderAttempt) => Promise<unknown>;
}) {
  let usage: ProviderUsage = readProviderUsage(undefined);
  const started = Date.now();
  let outcome: ProviderAttempt['outcome'] = 'success';
  try {
    return await options.run((metadata) => {
      usage = mergeProviderUsage(usage, readProviderUsage(metadata));
    });
  } catch (error) {
    outcome =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'SAFETY_BLOCK'
        ? 'safety_block'
        : options.signal.aborted
          ? 'aborted'
          : 'error';
    throw error;
  } finally {
    const value: ProviderAttempt = {
      model: options.model,
      attempt: options.attempt,
      outcome,
      durationMs: Math.max(0, Date.now() - started),
      usage,
    };
    // Logs never include exception messages, user IDs, contents, titles or request IDs.
    console.info('camellia_provider_usage', value);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        options.record(value),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('OBSERVATION_TIMEOUT')),
            1000,
          );
        }),
      ]);
    } catch {
      console.warn('camellia_usage_observation_unavailable', {
        stage: 'record',
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
export async function* observeUsageChunks<
  T extends { usageMetadata?: unknown },
>(chunks: AsyncIterable<T>, report: (value: unknown) => void) {
  for await (const chunk of chunks) {
    report(chunk.usageMetadata);
    yield chunk;
  }
}
