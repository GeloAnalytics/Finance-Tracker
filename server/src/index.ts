import { app, dbStatus } from './app';
import { initializeDatabase } from './db/init';

const PORT = parseInt(process.env.PORT || '3001');

// Start server with DB initialization
async function start() {
  try {
    await initializeDatabase();
    Object.assign(dbStatus, { ok: true, tables: true, error: undefined });
  } catch (err: any) {
    Object.assign(dbStatus, { ok: false, error: err.message });
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
