const SESSION_KEY = "khush_analytics_session_id";
const ANON_KEY = "khush_analytics_anonymous_id";

function randomId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateSessionId() {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = randomId("sess");
    localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return randomId("sess");
  }
}

export function getOrCreateAnonymousId() {
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const created = randomId("anon");
    localStorage.setItem(ANON_KEY, created);
    return created;
  } catch {
    return randomId("anon");
  }
}
