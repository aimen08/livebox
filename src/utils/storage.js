const PREFIX = "livebox_";

export function storageGet(key, fallback = null) {
  try {
    const val = localStorage.getItem(PREFIX + key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}
