const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "";

function loadMetaPixel(pixelId) {
  if (typeof window === "undefined" || !pixelId || window.fbq) return;

  const n = window;
  const t = document;
  const s = "script";
  const id = pixelId;

  n.fbq =
    n.fbq ||
    function fbq(...args) {
      (n.fbq.q = n.fbq.q || []).push(args);
    };
  n._fbq = n._fbq || n.fbq;
  n.fbq.loaded = true;
  n.fbq.version = "2.0";
  n.fbq.queue = n.fbq.q || [];

  const script = t.createElement(s);
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const first = t.getElementsByTagName(s)[0];
  first?.parentNode?.insertBefore(script, first);

  window.fbq("init", id);
  window.fbq("track", "PageView");

  if (import.meta.env.DEV) {
    console.info("[Pixels] Meta Pixel initialized", id);
  }
}

export function initMarketingPixels() {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];

  if (META_PIXEL_ID) {
    loadMetaPixel(META_PIXEL_ID);
  } else if (import.meta.env.DEV) {
    console.warn(
      "[Pixels] Meta Pixel not loaded. Add VITE_META_PIXEL_ID to .env (Events Manager → Pixel ID).",
    );
  }

  if (import.meta.env.DEV) {
    console.info("[Pixels] Dev logging on — watch [Pixels:dataLayer|meta|snap] in console.");
  }
}
