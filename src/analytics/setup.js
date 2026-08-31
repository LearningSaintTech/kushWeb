import { trackEvent } from "./tracker.js";
import { ANALYTICS_EVENTS } from "./catalog.js";

let installed = false;

function isTimeoutError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "");
  return (
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    /timeout of \d+ms exceeded/i.test(message) ||
    /timeout.*exceeded/i.test(message)
  );
}

export function setupAnalyticsErrorCapture(axiosClient) {
  if (installed || typeof window === "undefined") return;
  installed = true;

  if (axiosClient?.interceptors?.response) {
    axiosClient.interceptors.response.use(
      (res) => res,
      (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || "";
        if (String(url).includes("/analytics/events") || String(url).includes("/client-errors/timeout")) {
          return Promise.reject(error);
        }
        if (isTimeoutError(error)) {
          trackEvent({
            eventType: ANALYTICS_EVENTS.API_TIMEOUT,
            meta: {
              url: String(url).slice(0, 200),
              method: (error?.config?.method || "get").toUpperCase(),
              timeoutMs: error?.config?.timeout ?? null,
              code: error?.code || null,
              message: String(error?.message || "").slice(0, 120),
            },
          });
        } else if (status && status >= 400) {
          trackEvent({
            eventType: ANALYTICS_EVENTS.API_ERROR,
            meta: {
              status,
              url: String(url).slice(0, 200),
              method: (error?.config?.method || "get").toUpperCase(),
            },
          });
        } else if (!error?.response) {
          trackEvent({
            eventType: ANALYTICS_EVENTS.NETWORK_ERROR,
            meta: { message: String(error?.message || "network").slice(0, 120) },
          });
        }
        return Promise.reject(error);
      },
    );
  }

  window.addEventListener("error", (event) => {
    trackEvent({
      eventType: ANALYTICS_EVENTS.UI_EXCEPTION,
      meta: {
        message: String(event?.message || "error").slice(0, 200),
        source: event?.filename,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    trackEvent({
      eventType: ANALYTICS_EVENTS.UI_EXCEPTION,
      meta: {
        message: String(reason?.message || reason || "unhandled").slice(0, 200),
        type: "unhandledrejection",
      },
    });
  });
}
