/**
 * Web Push: subscribe when authenticated, unsubscribe on logout.
 * Uses VITE_VAPID_PUBLIC_KEY. If not set, push subscription is skipped.
 */
import { useEffect, useRef } from 'react';
import { notificationService } from '../../services/notification.service.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const SW_PATH = '/sw.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function subscriptionToPayload(subscription) {
  const key = (keyName) => {
    const buf = subscription.getKey(keyName);
    if (!buf) return null;
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: key('p256dh'),
      auth: key('auth'),
    },
  };
}

/**
 * Call from a component inside AuthProvider and NotificationProvider.
 * When token is set: registers SW, requests permission, subscribes, sends to backend.
 * When token is cleared: calls pushUnsubscribe with stored endpoint.
 */
export function usePushSubscribe(token) {
  const endpointRef = useRef(null);

  useEffect(() => {
    if (!token) {
      const endpoint = endpointRef.current;
      if (endpoint) {
        notificationService.pushUnsubscribe(endpoint).catch(() => {});
        endpointRef.current = null;
      }
      return;
    }

    if (!VAPID_PUBLIC_KEY || typeof navigator === 'undefined' || !navigator.serviceWorker) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
        await navigator.serviceWorker.ready;
        if (cancelled) return;

        const permission = await Notification.requestPermission();
        if (cancelled || permission !== 'granted') return;

        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        if (cancelled) return;

        const payload = subscriptionToPayload(subscription);
        await notificationService.pushSubscribe(payload, 'web');
        endpointRef.current = subscription.endpoint;
      } catch {
        // permission denied, push not supported, or API error
      }
    })();

    return () => {
      cancelled = true;
      const endpoint = endpointRef.current;
      if (endpoint) {
        notificationService.pushUnsubscribe(endpoint).catch(() => {});
        endpointRef.current = null;
      }
    };
  }, [token]);

  return null;
}
