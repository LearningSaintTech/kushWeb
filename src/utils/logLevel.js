/**
 * Logging is controlled by VITE_APP_ENV in your .env file:
 *   dev  → all console.* and debugLog output enabled
 *   prod → no logs in the browser
 *
 * If VITE_APP_ENV is unset: dev server → logs on, production build → logs off.
 */

function normalizeAppEnv(value) {
  const v = String(value ?? "").toLowerCase().trim();
  if (v === "dev" || v === "development") return "dev";
  if (v === "prod" || v === "production") return "prod";
  return "";
}

export function resolveAppEnv() {
  const fromEnv = normalizeAppEnv(import.meta.env.VITE_APP_ENV);
  if (fromEnv) return fromEnv;
  return import.meta.env.PROD ? "prod" : "dev";
}

export function isLoggingEnabled() {
  return resolveAppEnv() === "dev";
}
