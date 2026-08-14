import { API_BASE_URL, isDebug } from "../services/config.js";
import { debugLog } from "../utils/debugLog.js";
import { getCurrentAccessToken } from "../services/axiosClient.js";
import { getOrCreateAnonymousId, getOrCreateSessionId } from "./session.js";
import { createAnalyticsQueue } from "./queue.js";
import { utmFieldsForPayload, captureUtmFromUrl } from "./utm.js";

const INGEST_URL = `${API_BASE_URL}/analytics/events`;
const ANALYTICS_KEY = import.meta.env.VITE_ANALYTICS_INGEST_KEY || "";
const SESSION_START_SENT_KEY = "khush_analytics_session_start_sent";
let inMemorySessionStartSent = false;

const queue = createAnalyticsQueue(async (events) => {
  const headers = {
    "Content-Type": "application/json",
    "x-client-channel": "website",
    "x-source-platform": "website",
  };
  if (ANALYTICS_KEY) headers["x-api-key"] = ANALYTICS_KEY;

  const body = events.length === 1 ? events[0] : { events };
  await fetch(INGEST_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    keepalive: true,
    credentials: "include",
  });
});

function getDeviceType() {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getAuthToken() {
  return getCurrentAccessToken();
}

function parseJwtUserId(token) {
  try {
    const payload = token?.split(".")?.[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded?.userId || decoded?.id || null;
  } catch {
    return null;
  }
}

export function pushToDataLayer(payload) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

function buildBasePayload() {
  captureUtmFromUrl();
  const token = getAuthToken();
  const userId = parseJwtUserId(token);
  const utm = utmFieldsForPayload();
  return {
    channel: "website",
    sourcePlatform: "website",
    ingestSource: "client",
    sessionId: getOrCreateSessionId(),
    anonymousId: getOrCreateAnonymousId(),
    userId: userId || undefined,
    timestamp: new Date().toISOString(),
    occurredAt: new Date().toISOString(),
    path: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
    referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    deviceType: getDeviceType(),
    browser: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
    meta: utm.meta,
  };
}

/**
 * Track a single analytics event (queued + batched to backend).
 */
export function trackEvent(eventPayload = {}, options = {}) {
  const { eventType } = eventPayload;
  if (!eventType) return Promise.resolve();

  const base = buildBasePayload();
  const payload = {
    ...base,
    ...eventPayload,
    meta: {
      ...(base.meta || {}),
      ...(eventPayload.meta || {}),
    },
  };

  pushToDataLayer({
    event: eventType,
    ...payload,
  });

  if (isDebug()) {
    debugLog("[GTM] Event pushed:", eventType);
  }

  if (options.immediate) {
    const headers = {
      "Content-Type": "application/json",
      "x-client-channel": "website",
      "x-source-platform": "website",
    };
    if (ANALYTICS_KEY) headers["x-api-key"] = ANALYTICS_KEY;
    return fetch(INGEST_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "include",
    }).catch((error) => {
      if (isDebug()) {
        debugLog("[Analytics] immediate track failed", error?.message || error);
      }
    });
  }

  queue.enqueue(payload);
  return Promise.resolve();
}

export function flushAnalyticsQueue() {
  return queue.flushNow();
}

export function trackSessionStart(extra = {}) {
  if (inMemorySessionStartSent) return Promise.resolve();
  try {
    if (typeof window !== "undefined" && window.sessionStorage?.getItem(SESSION_START_SENT_KEY) === "1") {
      inMemorySessionStartSent = true;
      return Promise.resolve();
    }
  } catch {
    /* ignore */
  }

  inMemorySessionStartSent = true;
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage?.setItem(SESSION_START_SENT_KEY, "1");
    }
  } catch {
    /* ignore */
  }
  if (isDebug()) {
    debugLog("[Analytics] session_start emitted", {
      path: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
      at: new Date().toISOString(),
    });
  }
  return trackEvent({ eventType: "session_start", ...extra }, { immediate: true });
}

export function trackPageView(extra = {}) {
  return trackEvent({ eventType: "page_view", ...extra });
}

export function trackRouteChange(extra = {}) {
  return trackEvent({ eventType: "route_change", ...extra });
}

export function trackSessionEnd(extra = {}) {
  return trackEvent({ eventType: "session_end", ...extra }, { immediate: true });
}
