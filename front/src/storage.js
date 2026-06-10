const META_KEY = "ticketing:event-meta";
const CATEGORIES_KEY = "ticketing:categories";
const SESSION_CLIENT_KEY = "ticketing:session-client-id";

export function loadEventMeta() {
  return readJson(META_KEY, {});
}

export function saveEventMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export function loadCategories() {
  return readJson(CATEGORIES_KEY, {});
}

export function saveCategories(categories) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function getSessionClientId() {
  return localStorage.getItem(SESSION_CLIENT_KEY);
}

export function setSessionClientId(clientId) {
  localStorage.setItem(SESSION_CLIENT_KEY, String(clientId));
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

