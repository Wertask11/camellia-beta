/** One publication decision for API and bundled UI. Only this boolean is public. */
export function circleBuildEnabled(env: Record<string, string | undefined>): boolean {
  // A declared server switch is authoritative, including an explicit OFF.
  if (env.CAMELLIA_CIRCLE_ENABLED !== undefined) return env.CAMELLIA_CIRCLE_ENABLED === 'true';
  return env.VITE_CIRCLE_ENABLED === 'true';
}
