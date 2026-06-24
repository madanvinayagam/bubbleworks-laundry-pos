import type { ApiSession } from "./api";

const SESSION_KEY = "bubbleworks_session";

export function saveSession(session: ApiSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): ApiSession | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ApiSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}
