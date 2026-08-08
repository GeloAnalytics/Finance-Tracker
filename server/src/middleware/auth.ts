import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const AUTH_COOKIE_NAME = 'fw_token';

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
    jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}
