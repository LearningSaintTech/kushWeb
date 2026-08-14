import { trackEvent } from "./tracker.js";
import { ANALYTICS_EVENTS } from "./catalog.js";

let installed = false;

export function setupAnalyticsErrorCapture(axiosClient) {
  if (installed || typeof window === "undefined") return;
  installed = true;

  if (axiosClient?.interceptors?.response) {
    axiosClient.interceptors.response.use(
      (res) => res,
      (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || "";
        if (status && status >= 400 && !String(url).includes("/analytics/events")) {
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
