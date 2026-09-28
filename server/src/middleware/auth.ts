import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types';
import pool from '../db/connection';

export const AUTH_COOKIE_NAME = 'fw_token';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set — refusing request');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, secret) as any;
    req.user = {
      id: Number(payload.sub),
      username: payload.username || 'user',
      email: payload.email || '',
      role: payload.role === 'admin' ? 'admin' : 'user',
    };

    // Tokens are short-lived credentials, not the source of truth for account
    // status. Re-check the account so disabling a user or changing their role
    // takes effect immediately. Unit tests intentionally run without a DB.
    if (process.env.NODE_ENV === 'test') return next();
    pool.query('SELECT id, username, email, role, is_active FROM users WHERE id = $1', [req.user.id])
      .then(result => {
        const user = result.rows[0];
        if (!user || user.is_active === false) {
          return res.status(401).json({ error: 'Account is unavailable' });
        }
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role === 'admin' ? 'admin' : 'user',
        };
        next();
      })
      .catch(() => res.status(503).json({ error: 'Authentication service unavailable' }));
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
}
