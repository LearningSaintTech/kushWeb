/** In-memory access token only — never persist to localStorage. */
let memoryToken = null;
const listeners = new Set();

function notify() {
  const token = memoryToken;
  listeners.forEach((fn) => {
    try {
      fn(token);
    } catch {
      /* ignore */
    }
  });
}

export function getMemoryToken() {
  return memoryToken;
}

export function setMemoryToken(token) {
  memoryToken = token || null;
  notify();
}

export function clearMemoryToken() {
  memoryToken = null;
  notify();
}

export function subscribeMemoryToken(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}
