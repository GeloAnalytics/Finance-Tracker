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

describe('input validation', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('rejects a non-numeric transaction amount with 400, not 500', async () => {
    const agent = await authedAgent();
    const res = await agent.post('/api/transactions').send({ type: 'expense', amount: 'abc', category_id: 1 });
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects a missing debt name with 400', async () => {
    const agent = await authedAgent();
    const res = await agent.post('/api/debts').send({ total_amount: 100, current_balance: 50 });
    expect(res.status).toBe(400);
  });

  it('rejects a negative savings contribution with 400', async () => {
    const agent = await authedAgent();
    const res = await agent.post('/api/savings/1/contribute').send({ amount: -5 });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid transaction type', async () => {
    const agent = await authedAgent();
    const res = await agent.post('/api/transactions').send({ type: 'transfer', amount: 10, category_id: 1 });
    expect(res.status).toBe(400);
  });

  it('accepts a valid transaction and coerces the amount to a number before hitting the DB', async () => {
    queryMock.mockResolvedValue({ rows: [{ id: 1, amount: 10.5 }] });
    const agent = await authedAgent();
    const res = await agent
      .post('/api/transactions')
      .send({ type: 'expense', amount: '10.50', category_id: 1, description: 'coffee' });

    expect(res.status).toBe(201);
    const [, insertParams] = queryMock.mock.calls[0];
    expect(insertParams[1]).toBe(10.5);
    expect(typeof insertParams[1]).toBe('number');
  });
});
