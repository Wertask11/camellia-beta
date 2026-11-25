/* Camellia notifications. The push carries no data; the text is always the same generic line,
   so nothing personal (Check, conversation, names, Circle themes) ever appears on the lock screen. */
self.addEventListener('push', (event) => {
  event.waitUntil(self.registration.showNotification('Camellia', {
    body: '今日は、自分のために何する？選択肢を見にいく。',
    icon: '/icons/camellia-icon-192.png',
    badge: '/icons/camellia-icon-192.png',
    tag: 'camellia-daily',
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) return open.focus();
    return self.clients.openWindow('/');
  })());
});
