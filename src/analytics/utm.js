const UTM_STORAGE_KEY = "khush_analytics_utm";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export function captureUtmFromUrl(url = typeof window !== "undefined" ? window.location.href : "") {
  if (!url) return {};
  try {
    const params = new URL(url).searchParams;
    const utm = {};
    for (const key of UTM_KEYS) {
      const val = params.get(key);
      if (val) utm[key] = val;
    }
    if (Object.keys(utm).length && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
      } catch {
        /* ignore */
      }
    }
    return utm;
  } catch {
    return {};
  }
}

export function getStoredUtm() {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function utmFieldsForPayload() {
  const utm = getStoredUtm();
  return {
    utmSource: utm.utm_source,
    utmMedium: utm.utm_medium,
    utmCampaign: utm.utm_campaign,
    meta: Object.keys(utm).length ? { utm } : undefined,
  };
}
