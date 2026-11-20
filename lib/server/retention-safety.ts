/** An expired lease or missing provider fields never prove that a request was free or closed. */
export function requestReceiptClosed(value: Record<string, unknown>) {
  return ['success', 'error', 'aborted'].includes(String(value.state));
}
export function providerUsageClosed(value: Record<string, unknown>) {
  const usage = value.usage as Record<string, unknown> | undefined,
    estimate = value.estimate as Record<string, unknown> | undefined;
  return (
    value.usageIncomplete !== true &&
    estimate?.status === 'estimate' &&
    typeof estimate.amountYen === 'number' &&
    Number.isFinite(estimate.amountYen) &&
    estimate.amountYen >= 0 &&
    Boolean(
      usage &&
      ['input', 'output', 'thinking', 'cached'].every(
        (k) => Number.isSafeInteger(usage[k]) && Number(usage[k]) >= 0,
      ),
    )
  );
}
