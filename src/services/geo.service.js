/**
 * Geolocation + reverse geocoding to resolve pincode from current position.
 * Uses backend proxy (GET /api/geo/reverse) when VITE_API_URL is set to avoid CORS;
 * otherwise falls back to Nominatim (may be blocked by CORS in browser).
 */

import { API_BASE_URL } from './config.js';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'KhushWeb/1.0 (location-pincode)';

/** User-friendly messages for geolocation errors */
const GEO_ERROR_MESSAGES = {
  1: 'Location permission denied. Please allow location or choose from the list.',
  2: 'Location unavailable. Please choose from the list.',
  3: 'Location request timed out. Please try again or choose from the list.',
};

/**
 * Get current position from browser.
 * @returns {Promise<{ latitude: number, longitude: number }>}
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      console.log('[Location] geolocation not supported');
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    console.log('[Location] requesting geolocation...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        console.log('[Location] geolocation success', coords);
        resolve(coords);
      },
      (err) => {
        const code = err?.code ?? 0;
        const message = GEO_ERROR_MESSAGES[code] ?? err?.message ?? 'Unable to get location';
        console.log('[Location] geolocation error', { code, message, err });
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

/**
 * Reverse geocode via backend proxy (avoids CORS). Prefer when VITE_API_URL is set.
 */
async function reverseGeocodeViaBackend(lat, lon) {
  const base = (typeof API_BASE_URL === 'string' && API_BASE_URL) ? API_BASE_URL.replace(/\/$/, '') : '';
  console.log('[Location] reverseGeocode: API_BASE_URL =', API_BASE_URL, 'base =', base);
  if (!base) {
    console.log('[Location] reverseGeocode: skipping backend (no base URL)');
    return null;
  }
  const url = `${base}/geo/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  console.log('[Location] reverseGeocode: fetching backend', url);
  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    console.log('[Location] reverseGeocode: backend response', res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      console.log('[Location] reverseGeocode: backend error body', text);
      return null;
    }
    const json = await res.json();
    console.log('[Location] reverseGeocode: backend data', json);
    if (json?.success && json?.data) return json.data;
    return null;
  } catch (e) {
    console.log('[Location] reverseGeocode: backend fetch failed', e);
    return null;
  }
}

/**
 * Reverse geocode via Nominatim (direct). May be blocked by CORS in browser.
 */
async function reverseGeocodeDirect(lat, lon) {
  console.log('[Location] reverseGeocode: trying direct Nominatim', { lat, lon });
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'json',
    addressdetails: '1',
  });
  const url = `${NOMINATIM_BASE}?${params.toString()}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    console.log('[Location] reverseGeocode: Nominatim error', res.status, res.statusText);
    throw new Error('Reverse geocode failed');
  }
  const data = await res.json();
  console.log('[Location] reverseGeocode: Nominatim raw', data);
  const addr = data?.address ?? {};
  const pincode = addr.postcode ?? addr.pin_code ?? addr.pincode ?? null;
  const parts = [
    addr.suburb ?? addr.neighbourhood ?? addr.village ?? addr.town,
    addr.city ?? addr.city_district ?? addr.state_district,
    addr.state,
    addr.country,
  ].filter(Boolean);
  const addressLabel = parts.length ? parts.join(', ') : (data?.display_name ?? (pincode ? `Pin ${pincode}` : null));
  return {
    pincode: pincode ? String(pincode).replace(/\s+/g, '').slice(0, 10) : null,
    addressLabel: addressLabel || (pincode ? `Pin ${pincode}` : null),
  };
}

/**
 * Reverse geocode lat/lon to address with pincode.
 * Tries backend proxy first, then direct Nominatim.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ pincode: string | null, addressLabel: string | null }>}
 */
export async function reverseGeocode(lat, lon) {
  const fromBackend = await reverseGeocodeViaBackend(lat, lon);
  if (fromBackend) {
    console.log('[Location] reverseGeocode: using backend result', fromBackend);
    return fromBackend;
  }
  const direct = await reverseGeocodeDirect(lat, lon);
  console.log('[Location] reverseGeocode: using direct result', direct);
  return direct;
}

/**
 * Get current location and resolve to pincode + address label.
 * @returns {Promise<{ pincode: string | null, addressLabel: string | null }>}
 */
export async function getCurrentLocationPincode() {
  const { latitude, longitude } = await getCurrentPosition();
  const result = await reverseGeocode(latitude, longitude);
  const out = {
    pincode: result?.pincode ?? null,
    addressLabel: result?.addressLabel ?? result?.address_label ?? null,
  };
  console.log('[Location] getCurrentLocationPincode result', out);
  return out;
}
