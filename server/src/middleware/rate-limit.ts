import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const store = new Map<string, { count: number; resetAt: number }>();

  // Periodically sweep expired entries to prevent memory leaks in long-running processes
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }
  }, Math.max(options.windowMs, 60000));

  // Allow Node process to exit cleanly during tests
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', options.max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + options.windowMs) / 1000));
      return next();
    }

    if (current.count >= options.max) {
      const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetAt / 1000));
      return res.status(429).json({ error: options.message });
    }

    current.count += 1;
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - current.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetAt / 1000));
    next();
  };
}

export const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Please try again later.',
});

export const registerRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many account registrations from this IP. Please try again later.',
});
