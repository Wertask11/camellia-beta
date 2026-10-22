/** HTTP acceptance is transport evidence, not proof of PostHog ingestion or UI visibility. */
export type DeliveryResult =
  | { status: 'accepted'; at: string; httpStatus: number }
  | { status: 'suppressed'; reason: 'dnt' | 'opt_out' | 'expired' | 'invalid_event' };
export type DeliveryPacket = {
  id: string; event: string; createdAt: string; profileKey: string;
  destination: string; payload: Record<string, unknown>;
};
type Row = DeliveryPacket & { sequence?: number; attempts: number; nextAttempt: number; blocked?: boolean; receipt?: { at: string; httpStatus: number } };
export const ANALYTICS_OUTBOX_KEY = 'camellia-analytics-delivery-v1:';
export const MAX_DELIVERY_AGE = 7 * 86400000;
const MAX_ROWS = 500;
export function createDeliveryQueue(deps: {
  storage: () => Storage; now?: () => number;
  send: (packet: DeliveryPacket) => Promise<number>; permitted: () => boolean;
}) {
  const now = deps.now ?? Date.now;
  let active = '', destination = '', allowed = true, running = false, generation = 0, storageRetryAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const callbacks = new Map<string, (result: DeliveryResult) => void>();
  const key = (id: string) => ANALYTICS_OUTBOX_KEY + encodeURIComponent(id);
  const valid = (row: Row) => row && typeof row.id === 'string' && row.id.length < 150 &&
    typeof row.event === 'string' && typeof row.profileKey === 'string' && typeof row.destination === 'string' &&
    typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt)) &&
    row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload) &&
    Number.isInteger(row.attempts) && row.attempts >= 0 && Number.isFinite(row.nextAttempt) &&
    (!row.receipt || (typeof row.receipt.at === 'string' && Number.isFinite(Date.parse(row.receipt.at)) && row.receipt.httpStatus >= 200 && row.receipt.httpStatus < 300));
  function read(): Row[] {
    const storage = deps.storage(), rows: Row[] = [];
    // Each event has its own key. Two tabs cannot overwrite one another's entire outbox.
    for (const name of Object.keys(storage)) {
      if (!name.startsWith(ANALYTICS_OUTBOX_KEY)) continue;
      try {
        const row = JSON.parse(storage.getItem(name) ?? 'null') as Row;
        if (!valid(row) || name !== key(row.id)) continue; // Preserve corrupt data, never transmit it.
        if (Date.parse(row.createdAt) < now() - MAX_DELIVERY_AGE) { storage.removeItem(name); continue; }
        rows.push(row);
      } catch { /* preserve unreadable entries */ }
    }
    rows.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || (a.sequence ?? 0) - (b.sequence ?? 0));
    const oldReceipts = rows.filter(row => row.receipt).slice(0, -MAX_ROWS);
    for (const row of oldReceipts) storage.removeItem(key(row.id));
    return rows.filter(row => !oldReceipts.includes(row));
  }
  const matches = (row: Row) => row.profileKey === active && row.destination === destination;
  const stop = () => { if (timer) clearTimeout(timer); timer = undefined; };
  function schedule() {
    stop();
    if (!allowed || !active || !deps.permitted()) return;
    try {
      const first = read().find(row => matches(row) && !row.receipt && !row.blocked);
      if (first) timer = setTimeout(() => { timer = undefined; void flush(); }, Math.max(0, Math.max(first.nextAttempt, storageRetryAt) - now()));
    } catch { /* storage failure pauses delivery */ }
  }
  function finish(row: Row) {
    if (!row.receipt) return;
    const callback = callbacks.get(row.id); callbacks.delete(row.id);
    callback?.({ status: 'accepted', ...row.receipt });
  }
  async function flush() {
    stop();
    if (running || !allowed || !active || !deps.permitted()) return;
    if (now() < storageRetryAt) { schedule(); return; }
    running = true;
    const currentGeneration = generation;
    try {
      const all = read();
      for (const row of all.filter(matches)) {
        if (row.receipt) { finish(row); continue; }
        if (row.blocked) continue;
        if (currentGeneration !== generation || !allowed || !deps.permitted() || !matches(row) || row.nextAttempt > now()) break;
        let status = 0;
        try { status = await deps.send(row); } catch { /* no provider body or private errors logged */ }
        if (currentGeneration !== generation) break; // reset/delete cannot resurrect an in-flight outbox.
        if (status >= 200 && status < 300) {
          row.receipt = { at: new Date(now()).toISOString(), httpStatus: status };
          row.payload = {}; // receipts need no duplicate browser metadata/payload
          deps.storage().setItem(key(row.id), JSON.stringify(row));
          finish(row);
        } else {
          row.attempts++;
          row.blocked = status >= 400 && status < 500 && status !== 408 && status !== 429;
          row.nextAttempt = now() + Math.min(120000, 5000 * 2 ** Math.min(row.attempts - 1, 5));
          deps.storage().setItem(key(row.id), JSON.stringify(row));
          break;
        }
      }
    } catch { storageRetryAt = now() + 30000; /* Never spin/re-send continuously when receipt storage is full. */ }
    finally { running = false; schedule(); }
  }
  return {
    enqueue(packet: DeliveryPacket, callback?: (result: DeliveryResult) => void) {
      try {
        const rows = read(), existing = rows.find(row => row.id === packet.id);
        if (!existing && deps.storage().getItem(key(packet.id)) !== null) return false;
        if (existing && (existing.profileKey !== packet.profileKey || existing.destination !== packet.destination)) return false;
        if (existing?.receipt) { if (callback) queueMicrotask(() => callback({ status: 'accepted', ...existing.receipt! })); return true; }
        if (!existing) {
          if (rows.filter(row => !row.receipt).length >= MAX_ROWS) return false;
          const row: Row = { ...packet, sequence: Math.max(-1, ...rows.map(row => row.sequence ?? 0)) + 1, attempts: 0, nextAttempt: now() };
          if (!valid(row) || Date.parse(packet.createdAt) < now() - MAX_DELIVERY_AGE) return false;
          deps.storage().setItem(key(packet.id), JSON.stringify(row)); // durable before network
        }
        if (callback) callbacks.set(packet.id, callback);
        schedule(); return true;
      } catch { return false; }
    },
    activate(profileKey: string, target: string) { active = profileKey; destination = target; schedule(); },
    allow(value: boolean) { allowed = value; if (value) schedule(); else stop(); },
    retry() {
      storageRetryAt = 0;
      try { for (const row of read()) if (matches(row) && !row.receipt && !row.blocked) { row.nextAttempt = now(); deps.storage().setItem(key(row.id), JSON.stringify(row)); } } catch { return; }
      void flush();
    },
    clear() {
      stop(); generation++; active = ''; callbacks.clear();
      try { for (const name of Object.keys(deps.storage())) if (name.startsWith(ANALYTICS_OUTBOX_KEY)) deps.storage().removeItem(name); } catch { /* records untouched */ }
    },
    pause() { active = ''; stop(); },
    flush,
  };
}
