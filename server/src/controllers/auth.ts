import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME } from '../middleware/auth';

const TOKEN_TTL = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    // Client and server are deployed on different origins, so the cookie
    // must be SameSite=None (requires Secure) to be sent cross-site at all.
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: COOKIE_MAX_AGE,
  };
}

function getPasswordHash(): string | null {
  if (process.env.AUTH_PASSWORD_HASH) return process.env.AUTH_PASSWORD_HASH;
  if (process.env.AUTH_PASSWORD) return bcrypt.hashSync(process.env.AUTH_PASSWORD, 10);
  return null;
}

export async function login(req: Request, res: Response) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET not set' });
  }

  const hash = getPasswordHash();
  if (!hash) {
    return res.status(500).json({ error: 'Server misconfigured: AUTH_PASSWORD not set' });
  }

  const { password } = req.body;
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const token = jwt.sign({ sub: 'owner' }, secret, { expiresIn: TOKEN_TTL });
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
  res.json({ ok: true });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
}

export function me(req: Request, res: Response) {
  const secret = process.env.JWT_SECRET;
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!secret || !token) return res.json({ authenticated: false });
  try {
    jwt.verify(token, secret);
    res.json({ authenticated: true });
  } catch {
    res.json({ authenticated: false });
  }
}
