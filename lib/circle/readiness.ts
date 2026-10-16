import { FIREBASE_PROJECT_ID, SERVER_ROOT } from '../server/admin.js';

type FeedQueryStatus = 'ready' | 'index_required' | 'permission_denied' | 'credential_rejected' | 'unavailable';

/** Fixed, plan-only query: never execute a feed, return records or modify indexes. */
export function createFeedQueryProbe(
  getToken: () => Promise<string>,
  request: typeof fetch = fetch,
  now = Date.now,
) {
  let cached: { until: number; value: FeedQueryStatus } | undefined;
  let pending: Promise<FeedQueryStatus> | undefined;
  const inspect = async (): Promise<FeedQueryStatus> => {
    try {
      const token = await getToken();
      const response = await request(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${SERVER_ROOT}:runQuery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'circle_posts' }],
            where: { fieldFilter: { field: { fieldPath: 'circleId' }, op: 'EQUAL', value: { stringValue: 'working' } } },
            orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }, { field: { fieldPath: '__name__' }, direction: 'DESCENDING' }],
            limit: 1,
          },
          explainOptions: { analyze: false },
        }),
      });
      if (response.ok) { await response.body?.cancel(); return 'ready'; }
      if (response.status === 401) return 'credential_rejected';
      if (response.status === 403) return 'permission_denied';
      const body = await response.json().catch(() => ({})) as { error?: { status?: string; message?: string } };
      if (body.error?.status === 'FAILED_PRECONDITION' && /index/i.test(body.error.message ?? '')) return 'index_required';
      return 'unavailable';
    } catch { return 'unavailable'; }
  };
  return async () => {
    if (cached && now() < cached.until) return cached.value;
    if (!pending) pending = inspect().then(value => { cached = { until: now() + 60_000, value }; return value; }).finally(() => { pending = undefined; });
    return pending;
  };
}
