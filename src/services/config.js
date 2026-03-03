const API_BASE_URL = import.meta.env.VITE_API_URL + "/api";

function isDebug() {
  const { VITE_DEBUG, DEV } = import.meta.env;
  return VITE_DEBUG === "true" || DEV === true;
}

export { API_BASE_URL, isDebug };