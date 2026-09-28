import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/db/connection', () => ({
  default: { query: vi.fn() },
}));

import { app } from '../src/app';
import pool from '../src/db/connection';

const queryMock = pool.query as unknown as ReturnType<typeof vi.fn>;

async function authedAgent() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ password: 'test-password' });
  return agent;
}

describe('GET /api/transactions pagination and filters', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [{ count: '0' }] });
  });

  it('clamps an excessive limit and normalizes a negative offset', async () => {
    const agent = await authedAgent();
    await agent.get('/api/transactions?limit=999999&offset=-5');

    const [, dataParams] = queryMock.mock.calls[0];
    expect(dataParams.at(-2)).toBe(200); // MAX_LIMIT
    expect(dataParams.at(-1)).toBe(0); // offset clamped to 0
  });

  it('defaults to 50 when limit/offset are missing', async () => {
    const agent = await authedAgent();
    await agent.get('/api/transactions');

    const [, dataParams] = queryMock.mock.calls[0];
    expect(dataParams.at(-2)).toBe(50);
    expect(dataParams.at(-1)).toBe(0);
  });

  it('applies identical filters to the page query and the count query, preventing drift', async () => {
    const agent = await authedAgent();
    await agent.get('/api/transactions?type=income&category_id=3');

    const [, dataParams] = queryMock.mock.calls[0];
    const [, countParams] = queryMock.mock.calls[1];
    // dataParams = [...filters, limit, offset]; countParams = [...filters]
    expect(dataParams.slice(0, -2)).toEqual(countParams);
  });

  it('filters transaction reads by the authenticated user without shared NULL rows', async () => {
    const agent = await authedAgent();
    await agent.get('/api/transactions');
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('t.user_id = $1');
    expect(sql).not.toContain('user_id IS NULL');
    expect(params[0]).toBe(1);
  });
});
