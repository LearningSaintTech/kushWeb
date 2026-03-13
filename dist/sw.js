/**
 * Minimal service worker for Web Push.
 * Handles push events and notificationclick (focus app).
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'Khush', body: '' };
  try {
    const data = event.data.json();
    payload = { title: data.title || payload.title, body: data.body || payload.body };
  } catch {
    payload.body = event.data.text() || '';
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/favicon.ico',
      tag: 'khush-notification',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0 && clientList[0].focus) {
        return clientList[0].focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
