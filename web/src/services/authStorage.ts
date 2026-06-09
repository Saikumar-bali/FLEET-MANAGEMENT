const STORAGE_KEY = 'fleet-auth-session';

type StoredSession = {
  accessToken: string;
  refreshToken: string;
};

export function readStoredSession(): StoredSession | null {
  const value = window.localStorage.getItem(STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeStoredSession(session: StoredSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}
