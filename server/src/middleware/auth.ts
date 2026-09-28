import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types';

export const AUTH_COOKIE_NAME = 'fw_token';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

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
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}
