import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/db/connection', () => ({
  default: { query: vi.fn().mockResolvedValue({ rows: [{ count: '0' }] }) },
}));

import { app } from '../src/app';
import { AUTH_COOKIE_NAME } from '../src/middleware/auth';
import pool from '../src/db/connection';

describe('auth', () => {
  it('rejects protected routes without a session', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('rejects an incorrect password', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('accepts the correct password and sets a session cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'test-password' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('allows protected routes once authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ password: 'test-password' });
    const res = await agent.get('/api/transactions');
    expect(res.status).not.toBe(401);
  });

  it('revokes access after logout', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ password: 'test-password' });
    await agent.post('/api/auth/logout');
    const res = await agent.get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('does not fall back to a shared password when production authentication storage fails', async () => {
    const queryMock = pool.query as unknown as ReturnType<typeof vi.fn>;
    queryMock.mockRejectedValueOnce(new Error('database unavailable'));
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'developer@example.com', password: 'test-password' });
      expect(res.status).toBe(503);
    } finally {
      process.env.NODE_ENV = previous;
      queryMock.mockReset();
      queryMock.mockResolvedValue({ rows: [{ count: '0' }] });
    }
  });

  it('denies the administrator API to normal users', async () => {
    const token = jwt.sign({ sub: 1, username: 'user', email: 'user@example.com', role: 'user' }, 'test-secret-for-vitest');
    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`);
    expect(res.status).toBe(403);
  });
});
