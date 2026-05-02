import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import transactionRoutes from './routes/transactions';
import budgetRoutes from './routes/budgets';
import debtRoutes from './routes/debts';
import savingsRoutes from './routes/savings';
import dashboardRoutes from './routes/dashboard';
import advisorRoutes from './routes/advisor';
import { initializeDatabase } from './db/init';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', (req, res) => {
  // Forward to dashboard categories handler
  import('./controllers/dashboard').then(m => m.getCategories(req, res));
});
app.use('/api/advisor', advisorRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), name: 'FinanceWise API' });
});

// Start server with DB initialization
async function start() {
  try {
    await initializeDatabase();
  } catch (err: any) {
    console.error('⚠️  Database initialization failed:', err.message);
    console.error('   The server will start, but database queries will fail.');
    console.error('   Check your DATABASE_URL environment variable.');
  }

  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║   💰 FinanceWise API Server Running       ║
  ║   📡 Port: ${PORT}                          ║
  ║   🌐 http://localhost:${PORT}                ║
  ╚═══════════════════════════════════════════╝
    `);
  });
}

start();

export default app;

