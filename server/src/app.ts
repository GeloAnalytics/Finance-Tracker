import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import budgetRoutes from './routes/budgets';
import debtRoutes from './routes/debts';
import savingsRoutes from './routes/savings';
import dashboardRoutes from './routes/dashboard';
import advisorRoutes from './routes/advisor';
import { requireAuth } from './middleware/auth';

import billRoutes from './routes/bills';
import adminRoutes from './routes/admin';
import { requireAdmin } from './middleware/auth';
import { initializeDatabase } from './db/init';

dotenv.config();

export const app = express();

// Vercel runs this Express app as a serverless function rather than through
// src/index.ts. Initialize the schema once per warm function so a fresh
// database is ready before the first request. Render still uses index.ts and
// keeps its existing startup initialization path.
let vercelDatabaseReady: Promise<void> | null = null;
const ensureVercelDatabase = (): Promise<void> => {
  if (!vercelDatabaseReady) {
    vercelDatabaseReady = initializeDatabase();
  }
  return vercelDatabaseReady;
};

if (process.env.VERCEL) {
  app.use(async (_req, res, next) => {
    try {
      await ensureVercelDatabase();
      next();
    } catch (err: any) {
      console.error('Vercel database initialization failed:', err.message);
      res.status(503).json({ error: 'Database unavailable' });
    }
  });
}

// Middleware
const configuredOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/+$/, '');
  if (configuredOrigins.includes(cleanOrigin)) return true;
  if (process.env.NODE_ENV !== 'production') {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;
  }
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

// CORS controls response access; it does not by itself stop a cross-site
// state-changing request. Reject those requests explicitly as well.
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin && !isOriginAllowed(origin)) {
      return res.status(403).json({ error: 'Untrusted request origin' });
    }
  }
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));

// Baseline security headers for the API. The frontend is a separate service,
// so a strict API CSP is not useful here, but these headers still reduce the
// impact of accidental embedding, MIME sniffing, and referrer leakage.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Request logging (skip in production/test to avoid leaking query strings into logs / noisy test output)
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });
}

// Auth routes are unprotected (login must be reachable before a session exists)
app.use('/api/auth', authRoutes);

// API Routes (all require an authenticated session)
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/budgets', requireAuth, budgetRoutes);
app.use('/api/debts', requireAuth, debtRoutes);
app.use('/api/savings', requireAuth, savingsRoutes);
app.use('/api/bills', requireAuth, billRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/categories', requireAuth, (req, res) => {
  // Forward to dashboard categories handler
  import('./controllers/dashboard').then(m => m.getCategories(req, res));
});
app.use('/api/advisor', requireAuth, advisorRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

// Health check — includes DB connectivity diagnostic
export const dbStatus: { ok: boolean; error?: string; tables?: boolean; categories?: number } = {
  ok: false,
  error: 'Not initialized yet',
};

app.get('/api/health', async (_req, res) => {
  // Quick DB probe
  const dbProbe = { connected: false, error: '' };
  try {
    const pool = (await import('./db/connection')).default;
    const r = await pool.query('SELECT COUNT(*) as n FROM categories');
    dbProbe.connected = true;
    dbStatus.categories = parseInt(r.rows[0].n);
  } catch (e: any) {
    dbProbe.error = e.message;
  }
  const database = process.env.NODE_ENV === 'production'
    ? { connected: dbProbe.connected }
    : { ...dbStatus, probe: dbProbe };
  res.json({
    status: 'ok',
    version: 'v2-autoinit',
    timestamp: new Date().toISOString(),
    name: 'FinanceWise API',
    database,
  });
});

export default app;

// Vercel's automatic Express detector loads this module directly and expects
// module.exports itself to be the request handler. Keep the normal exports for
// TypeScript tests and Render, but expose the app directly for Vercel.
if (process.env.VERCEL) {
  module.exports = app;
}
