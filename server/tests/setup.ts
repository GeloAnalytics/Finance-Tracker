// Deterministic env for tests — set before app.ts's dotenv.config() runs,
// since dotenv never overrides values that are already set.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-vitest';
process.env.AUTH_PASSWORD = 'test-password';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
