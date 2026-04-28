import { API_BASE_URL } from "../services/config.js";
import { ACCESS_TOKEN_KEY } from "../services/axiosClient.js";
import { getOrCreateAnonymousId, getOrCreateSessionId } from "./session.js";

const INGEST_URL = `${API_BASE_URL}/analytics/events`;
const ANALYTICS_KEY = import.meta.env.VITE_ANALYTICS_INGEST_KEY || "";

function getDeviceType() {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getAuthToken() {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
  } catch {
    return null;
  }
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
  const token = getAuthToken();
  const userId = parseJwtUserId(token);
  return {
    channel: "website",
    sessionId: getOrCreateSessionId(),
    anonymousId: getOrCreateAnonymousId(),
    userId: userId || undefined,
    timestamp: new Date().toISOString(),
    path: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
    referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    deviceType: getDeviceType(),
    browser: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}

export async function trackEvent(eventPayload = {}) {
  const payload = { ...buildBasePayload(), ...eventPayload };
  try {
    const headers = { "Content-Type": "application/json" };
      headers["x-client-channel"] = "website";
    if (ANALYTICS_KEY) headers["x-api-key"] = ANALYTICS_KEY;
    await fetch(INGEST_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "include",
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug("[Analytics] trackEvent failed", error?.message || error);
    }
  }
}

export function trackSessionStart(extra = {}) {
  return trackEvent({ eventType: "session_start", ...extra });
}

export function trackPageView(extra = {}) {
  return trackEvent({ eventType: "page_view", ...extra });
}
