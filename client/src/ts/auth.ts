/// <reference types="vite/client" />
// FinanceWise — Auth session helpers

import { getApiBase } from './config.js';

const BASE = getApiBase();

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface SessionResult {
  authenticated: boolean;
  user?: User;
}

export async function checkSession(): Promise<SessionResult> {
  try {
    const res = await fetch(`${BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) return { authenticated: false };
    const data = await res.json();
    if (data.authenticated && data.user) {
      return { authenticated: true, user: data.user };
    }
    return { authenticated: !!data.authenticated };
  } catch {
    return { authenticated: false };
  }
}

export async function login(identifier: string, password?: string): Promise<User> {
  // Support both single argument password or dual (identifier, password)
  const reqBody = password !== undefined ? { identifier, password } : { password: identifier };
  const res = await fetch(`${BASE}/auth/login`, {
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
  return data.user;
}

export async function register(username: string, email: string, password?: string): Promise<User> {
  const res = await fetch(`${BASE}/auth/register`, {
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
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}
