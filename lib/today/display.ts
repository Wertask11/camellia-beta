/* 「説明を少なめにする」: a display choice the person makes in My (never inferred from age or records).
   Stored on this device only; it hides the supporting copy marked with the `explain` class. */
export const LESS_EXPLAIN_KEY = 'camellia-less-explain';

export function readLessExplain() {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(LESS_EXPLAIN_KEY) === '1'; } catch { return false; }
}

export function applyLessExplain(on: boolean) {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('less-explain', on);
}
