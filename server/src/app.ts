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

dotenv.config();

export const app = express();

// Middleware
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin/non-browser requests (no Origin header)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

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
  res.json({
    status: 'ok',
    version: 'v2-autoinit',
    timestamp: new Date().toISOString(),
    name: 'FinanceWise API',
    database: { ...dbStatus, probe: dbProbe },
    env: { has_database_url: !!process.env.DATABASE_URL },
  });
});
