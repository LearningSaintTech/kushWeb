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

function isInvalidText(str) {
  if (typeof str !== 'string') return true;
  const trimmed = str.trim();
  return (
    !trimmed ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === '{}' ||
    trimmed === '[]' ||
    trimmed === '[object Object]'
  );
}

function containsWishlistKeyword(...args) {
  for (const arg of args) {
    if (!arg) continue;
    const str = typeof arg === 'string' ? arg : JSON.stringify(arg);
    if (str.toLowerCase().includes('wishlist')) {
      return true;
    }
  }
  return false;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let rawData = null;
  let textData = '';
  try {
    rawData = event.data.json();
  } catch {
    try {
      textData = event.data.text() || '';
    } catch {}
  }

  const notificationObj = rawData?.notification || {};
  const dataObj = rawData?.data || {};

  const title =
    rawData?.title ||
    notificationObj?.title ||
    dataObj?.title ||
    'Khush';

  const rawBody =
    rawData?.body ||
    rawData?.message ||
    rawData?.content ||
    rawData?.description ||
    notificationObj?.body ||
    notificationObj?.message ||
    dataObj?.body ||
    dataObj?.message ||
    dataObj?.content ||
    textData;

  const moduleName =
    rawData?.module ||
    rawData?.type ||
    notificationObj?.module ||
    dataObj?.module ||
    dataObj?.type ||
    '';

  const templateKey =
    rawData?.templateKey ||
    notificationObj?.templateKey ||
    dataObj?.templateKey ||
    '';

  const action =
    rawData?.action ||
    rawData?.eventType ||
    dataObj?.action ||
    dataObj?.eventType ||
    '';

  // 1. Drop any notification related to wishlist actions
  if (
    containsWishlistKeyword(
      moduleName,
      templateKey,
      action,
      title,
      rawBody,
      rawData?.metadata,
      dataObj?.metadata
    )
  ) {
    return;
  }

  // 2. Drop any notification with an empty, missing, or invalid body text
  if (isInvalidText(rawBody)) {
    return;
  }

  const cleanBody = typeof rawBody === 'string' ? rawBody.trim() : String(rawBody).trim();
  const cleanTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Khush';

  event.waitUntil(
    self.registration.showNotification(cleanTitle, {
      body: cleanBody,
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
