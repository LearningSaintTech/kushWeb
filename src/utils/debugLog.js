import { getOriginalConsole } from "./configureConsole.js";
import { isLoggingEnabled } from "./logLevel.js";

const out = getOriginalConsole();

export function debugLog(...args) {
  if (!isLoggingEnabled()) return;
  out.log(...args);
}

export function debugInfo(...args) {
  if (!isLoggingEnabled()) return;
  out.info(...args);
}

export function debugWarn(...args) {
  if (!isLoggingEnabled()) return;
  out.warn(...args);
}

export function debugError(...args) {
  if (!isLoggingEnabled()) return;
  out.error(...args);
}

/**
 * @deprecated Console is patched by configureConsole.js (imported first in main.jsx).
 */
export function silenceConsoleUnlessDebug() {}
