/** Foreground polling checks a member-only revision, not an entire feed. */
export function watchCircleUpdates(options: {
  active: () => boolean;
  currentVersion: () => number | undefined;
  readVersion: () => Promise<number | undefined>;
  refresh: () => Promise<void>;
  onError: (error: unknown) => void;
  intervalMs?: number;
}) {
  let stopped = false;
  let running = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (!stopped) timer = setTimeout(() => void check(), Math.min(30_000, (options.intervalMs ?? 3000) * 2 ** failures));
  };
  const check = async (force = false) => {
    if (stopped || running) return;
    clearTimeout(timer);
    running = true;
    try {
      if (!options.active()) return;
      const version = await options.readVersion();
      if (stopped || !options.active()) return;
      if (force || version !== options.currentVersion()) await options.refresh();
      failures = 0;
    } catch (error) {
      failures = Math.min(failures + 1, 4);
      if (!stopped && options.active()) options.onError(error);
    } finally {
      running = false;
      schedule();
    }
  };
  schedule();
  return {
    refresh: () => void check(true),
    stop: () => { stopped = true; clearTimeout(timer); },
  };
}
