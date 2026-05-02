import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();


const isProduction = !!process.env.DATABASE_URL;

const poolConfig: any = isProduction
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,                      // Supabase free-tier friendly
      idleTimeoutMillis: 30000,    // Close idle clients after 30s
      connectionTimeoutMillis: 10000, // Fail fast if DB unreachable
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'financewise',
      max: 10,
      connectionTimeoutMillis: 5000,
    };

console.log(`🔌 Database mode: ${isProduction ? 'PRODUCTION (DATABASE_URL)' : 'LOCAL'}`);

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
  // Don't crash — let individual requests handle the failure
});

export default pool;

