const UTM_STORAGE_KEY = "khush_analytics_utm";
/** Survives new tabs and return visits so orders days later still credit the link. */
const UTM_PERSISTED_KEY = "khush_analytics_utm_persisted";
const UTM_ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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
        localStorage.setItem(UTM_PERSISTED_KEY, JSON.stringify({ utm, at: Date.now() }));
      } catch {
        /* ignore */
      }
    }
    return utm;
  } catch {
    return {};
  }
}

function readPersistedUtm() {
  try {
    const raw = localStorage.getItem(UTM_PERSISTED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed?.utm || Date.now() - Number(parsed.at || 0) > UTM_ATTRIBUTION_WINDOW_MS) {
      localStorage.removeItem(UTM_PERSISTED_KEY);
      return {};
    }
    return parsed.utm;
  } catch {
    return {};
  }
}

export function getStoredUtm() {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    /* fall through */
  }
  return readPersistedUtm();
}

export function utmFieldsForPayload() {
  const utm = getStoredUtm();
  return {
    utmSource: utm.utm_source,
    utmMedium: utm.utm_medium,
    utmCampaign: utm.utm_campaign,
    utmContent: utm.utm_content,
    utmTerm: utm.utm_term,
    meta: Object.keys(utm).length ? { utm } : undefined,
  };
}
