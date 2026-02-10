import { API_BASE_URL } from "./config";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  profile: {
    firstName: string | null;
    lastName: string | null;
    language: string;
  } | null;
};

export type StoredAuthSession = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
};

const SESSION_STORAGE_KEY = "careboks.custom_auth.session";
const AUTH_CHANGED_EVENT = "careboks:auth-changed";

type ApiError = Error & {
  status?: number;
};

const createApiError = (status: number, message: string): ApiError => {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createApiError(response.status, json?.message ?? "Request failed");
  }

  return json as T;
};

const dispatchAuthChanged = () => {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const getStoredSession = (): StoredAuthSession | null => {
  const rawValue = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredAuthSession;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

export const setStoredSession = (session: StoredAuthSession) => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  dispatchAuthChanged();
};

export const clearStoredSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  dispatchAuthChanged();
};

export const onAuthChanged = (callback: () => void): (() => void) => {
  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, callback);
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
};

export const signUpWithBackend = async (input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) => {
  const session = await request<AuthResponse>("/auth/signup", {
    method: "POST",
    body: input
  });

  setStoredSession(session);
  return session;
};

export const signInWithBackend = async (input: { email: string; password: string }) => {
  const session = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: input
  });

  setStoredSession(session);
  return session;
};

export const refreshBackendSession = async () => {
  const currentSession = getStoredSession();
  if (!currentSession?.refreshToken) {
    clearStoredSession();
    return null;
  }

  const refreshedSession = await request<AuthResponse>("/auth/refresh", {
    method: "POST",
    body: {
      refreshToken: currentSession.refreshToken
    }
  });

  setStoredSession(refreshedSession);
  return refreshedSession;
};

export const getCurrentBackendUser = async (accessToken: string) => {
  const response = await request<{ user: AuthUser }>("/auth/me", {
    accessToken
  });

  return response.user;
};

export const restoreBackendSession = async (): Promise<StoredAuthSession | null> => {
  const currentSession = getStoredSession();
  if (!currentSession?.accessToken) {
    return null;
  }

  try {
    const user = await getCurrentBackendUser(currentSession.accessToken);
    const updatedSession = { ...currentSession, user };
    setStoredSession(updatedSession);
    return updatedSession;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status !== 401) {
      clearStoredSession();
      return null;
    }
  }

  try {
    const refreshedSession = await refreshBackendSession();
    if (!refreshedSession) {
      return null;
    }

    const user = await getCurrentBackendUser(refreshedSession.accessToken);
    const updatedSession = { ...refreshedSession, user };
    setStoredSession(updatedSession);
    return updatedSession;
  } catch {
    clearStoredSession();
    return null;
  }
};

export const logoutBackendSession = async () => {
  const currentSession = getStoredSession();
  if (!currentSession) {
    clearStoredSession();
    return;
  }

  try {
    await request<{ message: string }>("/auth/logout", {
      method: "POST",
      accessToken: currentSession.accessToken,
      body: {
        refreshToken: currentSession.refreshToken
      }
    });
  } catch {
  } finally {
    clearStoredSession();
  }
};
