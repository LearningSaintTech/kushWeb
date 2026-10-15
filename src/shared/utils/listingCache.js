/**
 * In-memory snapshot of product listings, keyed by history entry (location.key).
 *
 * When a shopper opens a product and presses Back, the listing remounts. Restoring its
 * already-loaded products (all infinite-scroll pages) lets <ScrollRestoration> scroll back
 * to the same card instead of landing on a short, page-1-only list.
 *
 * Only used on POP (Back/Forward) navigations; a fresh visit always loads fresh data.
 */

const MAX_ENTRIES = 20;
const MAX_AGE_MS = 30 * 60 * 1000;
const cache = new Map();

export function saveListingSnapshot(key, snapshot) {
  if (!key) return;
  cache.delete(key);
  cache.set(key, { ...snapshot, savedAt: Date.now() });
  while (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

export function readListingSnapshot(key) {
  if (!key) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > MAX_AGE_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}
