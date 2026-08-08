import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/db/connection', () => ({
  default: { query: vi.fn().mockResolvedValue({ rows: [{ count: '0' }] }) },
}));

import { app } from '../src/app';

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
});
