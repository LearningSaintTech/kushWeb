/**
 * Service worker for Web Push.
 * Handles push events and notificationclick (focus app).
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'Khush', body: '', module: '', type: '' };
  try {
    const data = event.data.json();
    if (data && typeof data === 'object') {
      payload = {
        title: data.title || payload.title,
        body: data.body || payload.body || '',
        module: data.module || data.type || '',
        type: data.type || data.eventType || '',
      };
    } else {
      payload.body = event.data.text() || '';
    }
  } catch {
    payload.body = event.data.text() || '';
  }

  // 1. Drop any notification with an empty or whitespace-only body
  const bodyText = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!bodyText) {
    return;
  }

  // 2. Drop any wishlist-related push notifications
  const mod = String(payload.module || payload.type || '').toLowerCase();
  if (mod.includes('wishlist')) {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: bodyText,
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

