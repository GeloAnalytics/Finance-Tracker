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

describe('Bills and Items API', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('updates an existing bill status, item_type, and details', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            user_id: 1,
            item_type: 'bill',
            name: 'Electricity Bill',
            amount: 2500,
            status: 'completed',
            due_date: '2026-11-01',
            notes: 'Paid via online banking',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            user_id: 1,
            item_type: 'bill',
            name: 'Electricity Bill',
            amount: 2500,
            status: 'completed',
            due_date: '2026-11-01',
            notes: 'Paid via online banking',
            category_name: 'Utilities',
            category_icon: '⚡',
          },
        ],
      });

    const agent = await authedAgent();
    const res = await agent
      .put('/api/bills/42')
      .send({
        item_type: 'bill',
        name: 'Electricity Bill',
        amount: 2500,
        status: 'completed',
        due_date: '2026-11-01',
        notes: 'Paid via online banking',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.name).toBe('Electricity Bill');

    const [updateSql, updateParams] = queryMock.mock.calls[0];
    expect(updateSql).toContain('UPDATE bills_and_items SET');
    expect(updateSql).toContain('item_type =');
    expect(updateSql).toContain('status =');
    expect(updateParams).toContain('completed');
    expect(updateParams).toContain('bill');
  });

  it('reopens a completed item back to pending', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            user_id: 1,
            item_type: 'to_buy',
            name: 'Desk Lamp',
            amount: 750,
            status: 'pending',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            user_id: 1,
            item_type: 'to_buy',
            name: 'Desk Lamp',
            amount: 750,
            status: 'pending',
          },
        ],
      });

    const agent = await authedAgent();
    const res = await agent.put('/api/bills/42').send({ status: 'pending' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    const [updateSql, updateParams] = queryMock.mock.calls[0];
    expect(updateSql).toContain('status =');
    expect(updateParams).toContain('pending');
  });

  it('validates status and rejects invalid status values', async () => {
    const agent = await authedAgent();
    const res = await agent.put('/api/bills/42').send({ status: 'unknown_status' });

    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
