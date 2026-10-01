/// <reference types="vite/client" />
// FinanceWise — Auth session helpers

import { getApiBase } from './config.js';

const BASE = getApiBase();
const TOKEN_KEY = 'fw_token';

function apiConnectionError(): Error {
  const target = BASE.startsWith('/') ? 'the local API server on port 3001' : BASE;
  return new Error(
    `Unable to connect to FinanceWise API (${target}). `
    + 'Start the server with "cd server && npm run dev", or verify the deployed API URL and CORS settings.'
  );
}

async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    // Browsers intentionally expose network and CORS failures as the same
    // TypeError. Replace the opaque native message with an actionable one.
    if (error instanceof TypeError) throw apiConnectionError();
    throw error;
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota / access errors
  }
}

export interface User {
  id: number;
  username: string;
  email: string;
  role?: 'user' | 'admin';
}

export interface SessionResult {
  authenticated: boolean;
  user?: User;
}

export async function checkSession(): Promise<SessionResult> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE}/auth/me`, {
      credentials: 'include',
      headers,
    });
    if (!res.ok) {
      if (res.status === 401) setAuthToken(null);
      return { authenticated: false };
    }
    const data = await res.json();
    if (data.authenticated && data.user) {
      return { authenticated: true, user: data.user };
    }
    if (!data.authenticated) {
      setAuthToken(null);
    }
    return { authenticated: !!data.authenticated };
  } catch {
    return { authenticated: false };
  }
}

export async function login(identifier: string, password?: string): Promise<User> {
  // Support both single argument password or dual (identifier, password)
  const reqBody = password !== undefined ? { identifier, password } : { password: identifier };
  const res = await authFetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }

  const data = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data.user;
}

export async function register(username: string, email: string, password?: string): Promise<User> {
  const res = await authFetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(err.error || 'Registration failed');
  }

  const data = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data.user;
}

export async function logout(): Promise<void> {
  setAuthToken(null);
  await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
}
