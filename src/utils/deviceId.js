const DEVICE_ID_KEY = 'khush_device_id';

/** Stable device id for refresh-token binding (not a secret). */
export function getOrCreateDeviceId() {
  try {
    if (typeof window === 'undefined') return `web_${Date.now()}`;
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `web_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `web_${Date.now()}`;
  }
}
