/// <reference types="vite/client" />
// FinanceWise — Auth session helpers

const BASE = import.meta.env.VITE_API_URL || '/api';

export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.authenticated;
  } catch {
    return false;
  }
}

export async function login(password: string): Promise<void> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}
