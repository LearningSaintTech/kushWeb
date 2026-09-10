import { isDebug } from "../services/config.js";
import { debugInfo, debugWarn } from '../utils/debugLog.js';

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "";
const OPENAI_PIXEL_ID = import.meta.env.VITE_OPENAI_PIXEL_ID || "B5BpwStkMHiJRu9GW1yKWf";

function loadMetaPixel(pixelId) {
  if (typeof window === "undefined" || !pixelId) return;
  if (window.__KHUSH_META_PIXEL_ID__ === pixelId) return;

  if (!window.fbq) {
    const n = window;
    n.fbq = function fbq(...args) {
      (n.fbq.q = n.fbq.q || []).push(args);
    };
    n._fbq = n._fbq || n.fbq;
    n.fbq.loaded = true;
    n.fbq.version = "2.0";
    n.fbq.queue = n.fbq.q || [];

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const first = document.getElementsByTagName("script")[0];
    first?.parentNode?.insertBefore(script, first);
  }

  window.fbq("set", "autoConfig", false, pixelId);
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  window.__KHUSH_META_PIXEL_ID__ = pixelId;

  if (isDebug()) {
    debugInfo("[Meta Pixel] Initialized", pixelId);
  }
}

function loadOpenaiPixel(pixelId) {
  if (typeof window === "undefined" || !pixelId) return;
  if (window.__KHUSH_OPENAI_PIXEL_ID__ === pixelId) return;

  try {
    if (!window.oaiq) {
      const q = function oaiq() {
        q.q.push(arguments);
      };
      q.q = [];
      window.oaiq = q;

      const script = document.createElement("script");
      script.async = true;
      script.src = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
      const first = document.getElementsByTagName("script")[0];
      if (first?.parentNode) {
        first.parentNode.insertBefore(script, first);
      } else {
        document.head?.appendChild(script);
      }
    }

    window.oaiq("init", {
      pixelId,
      ...(import.meta.env.DEV ? { debug: true } : {}),
    });
    window.__KHUSH_OPENAI_PIXEL_ID__ = pixelId;

    if (isDebug()) {
      debugInfo("[OpenAI Pixel] Initialized", pixelId);
    }
  } catch (err) {
    debugWarn("[OpenAI Pixel] Init failed", err?.message || err);
  }
}

/** Fallback if index.html injection did not run (e.g. missing env at dev server start). */
export function initMarketingPixels() {
  if (typeof window === "undefined") return;

  if (META_PIXEL_ID) {
    if (window.__KHUSH_META_PIXEL_ID__ === META_PIXEL_ID) {
      if (isDebug()) {
        debugInfo("[Meta Pixel] Active", META_PIXEL_ID);
      }
    } else {
      loadMetaPixel(META_PIXEL_ID);
    }
  } else if (isDebug()) {
    debugWarn(
      "[Meta Pixel] Not loaded — set VITE_META_PIXEL_ID in .env and restart npm run dev.",
    );
  }

  try {
    if (OPENAI_PIXEL_ID) {
      if (window.__KHUSH_OPENAI_PIXEL_ID__ === OPENAI_PIXEL_ID) {
        if (isDebug()) {
          debugInfo("[OpenAI Pixel] Active", OPENAI_PIXEL_ID);
        }
      } else {
        loadOpenaiPixel(OPENAI_PIXEL_ID);
      }
    } else if (isDebug()) {
      debugWarn(
        "[OpenAI Pixel] Not loaded — set VITE_OPENAI_PIXEL_ID in .env and restart npm run dev.",
      );
    }
  } catch (err) {
    debugWarn("[OpenAI Pixel] Bootstrap failed", err?.message || err);
  }
}
