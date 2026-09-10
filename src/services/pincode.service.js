/**
 * Pincode validation and lookup service using India Postal Pincode API & Nominatim fallback.
 */

const PINCODE_CACHE = new Map();

/**
 * Validates a 6-digit Indian pincode against Postal API and OpenStreetMap Nominatim.
 * @param {string|number} pinCode - 6-digit pincode
 * @returns {Promise<{ valid: boolean, message: string | null, city?: string, state?: string, district?: string, postOffices?: Array }>}
 */
export async function validatePincode(pinCode) {
  const pin = String(pinCode || '').trim().replace(/\D/g, '').slice(0, 6);

  if (pin.length !== 6) {
    return {
      valid: false,
      message: 'Please enter a valid pincode',
    };
  }

  // Indian postal pincodes range from 110001 to 855117 (first digit 1-9)
  if (!/^[1-9][0-9]{5}$/.test(pin) || /^(.)\1{5}$/.test(pin)) {
    return {
      valid: false,
      message: 'Please enter a valid pincode',
    };
  }

  if (PINCODE_CACHE.has(pin)) {
    return PINCODE_CACHE.get(pin);
  }

  // 1. Try local dev proxy to postalpincode.in (bypasses browser CORS in dev)
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
    const res = await fetch(`/api-postal/pincode/${pin}`, { signal: controller?.signal });
    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.Status === 'Success' && Array.isArray(result?.PostOffice) && result.PostOffice.length > 0) {
        const firstPo = result.PostOffice[0];
        const city = firstPo.District || firstPo.Block || firstPo.Division || '';
        const state = firstPo.State || firstPo.Circle || '';
        const out = {
          valid: true,
          message: null,
          city,
          state,
          district: firstPo.District || '',
          postOffices: result.PostOffice,
        };
        PINCODE_CACHE.set(pin, out);
        return out;
      } else if (result?.Status === 'Error' || result?.Message?.includes('No records found')) {
        const out = {
          valid: false,
          message: 'Please enter a valid pincode',
        };
        PINCODE_CACHE.set(pin, out);
        return out;
      }
    }
  } catch {
    // continue to next strategy
  }

  // 2. Try Nominatim OpenStreetMap (CORS-enabled worldwide)
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;
    const nomUrl = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(pin)}&country=India&addressdetails=1&format=json`;
    const res = await fetch(nomUrl, {
      signal: controller?.signal,
      headers: { 'User-Agent': 'KhushWeb/1.0 (pincode-validator)' },
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        if (data.length === 0) {
          const out = {
            valid: false,
            message: 'Please enter a valid pincode',
          };
          PINCODE_CACHE.set(pin, out);
          return out;
        }
        const first = data[0]?.address || {};
        const city = first.city || first.state_district || first.county || first.suburb || first.town || '';
        const state = first.state || '';
        const out = {
          valid: true,
          message: null,
          city,
          state,
          district: first.state_district || first.county || '',
        };
        PINCODE_CACHE.set(pin, out);
        return out;
      }
    }
  } catch {
    // continue to direct postal API
  }

  // 3. Try direct api.postalpincode.in (if browser/proxy permits)
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller?.signal });
    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.Status === 'Success' && Array.isArray(result?.PostOffice) && result.PostOffice.length > 0) {
        const firstPo = result.PostOffice[0];
        const city = firstPo.District || firstPo.Block || firstPo.Division || '';
        const state = firstPo.State || firstPo.Circle || '';
        const out = {
          valid: true,
          message: null,
          city,
          state,
          district: firstPo.District || '',
          postOffices: result.PostOffice,
        };
        PINCODE_CACHE.set(pin, out);
        return out;
      } else if (result?.Status === 'Error' || result?.Message?.includes('No records found')) {
        const out = {
          valid: false,
          message: 'Please enter a valid pincode',
        };
        PINCODE_CACHE.set(pin, out);
        return out;
      }
    }
  } catch (err) {
    console.warn('[PincodeValidator] direct fetch failed:', err?.message || err);
  }

  // Fallback if all networks fail: check standard range (110000 - 899999)
  const pinNum = parseInt(pin, 10);
  const looksValid = pinNum >= 110001 && pinNum <= 855117;
  return {
    valid: looksValid,
    message: looksValid ? null : 'Please enter a valid pincode',
  };
}

export const pincodeService = {
  validate: validatePincode,
};

export default pincodeService;
