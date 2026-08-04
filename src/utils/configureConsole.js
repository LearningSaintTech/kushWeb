/**
 * Patches global console in the browser when VITE_APP_ENV=prod.
 * Import this once at the top of main.jsx (before any other app code).
 */
import { isLoggingEnabled, resolveAppEnv } from "./logLevel.js";

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

/** Raw console — used by debugLog so output is never double-filtered. */
export function getOriginalConsole() {
  return originalConsole;
}

function noop() {}

export function configureConsole() {
  if (isLoggingEnabled()) {
    originalConsole.info(
      `[kushWeb] Dev logging ON (VITE_APP_ENV=${resolveAppEnv()}). Filter DevTools by [Community] or ▶ for upload flow.`,
    );
    return;
  }

  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
  console.error = noop;
}

configureConsole();
