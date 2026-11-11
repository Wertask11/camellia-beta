import { schoolParkAuth } from '../schoolpark/firebase';
import type { NotificationPreferences } from './preferences';
export async function saveServerNotificationPreferences(
  preferences: NotificationPreferences,
) {
  const user = schoolParkAuth.currentUser;
  if (!user || user.isAnonymous) return false;
  const headers = {
      Authorization: `Bearer ${await user.getIdToken()}`,
      'Content-Type': 'application/json',
    },
    options = { headers, signal: AbortSignal.timeout(10000) },
    read = await fetch('/api/camellia/notification-settings', options);
  if (!read.ok) return false;
  const v = (await read.json()) as { revision?: unknown };
  if (
    !Number.isSafeInteger(v.revision) ||
    schoolParkAuth.currentUser?.uid !== user.uid
  )
    return false;
  const saved = await fetch('/api/camellia/notification-settings', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ preferences, expectedRevision: v.revision }),
  });
  return saved.ok && schoolParkAuth.currentUser?.uid === user.uid;
}
