import { Request, Response } from 'express';
import pool from '../db/connection';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

function buildTransactionFilters(query: Request['query'], userId?: number) {
  const { type, category_id, from, to, search } = query;
  let clause = ' WHERE 1=1';
  const params: any[] = [];
  let paramIdx = 1;

  if (userId) {
    clause += ` AND (t.user_id = $${paramIdx++} OR t.user_id IS NULL)`;
    params.push(userId);
  }

  if (type) {
    clause += ` AND t.type = $${paramIdx++}`;
    params.push(type);
  }
  if (category_id) {
    clause += ` AND t.category_id = $${paramIdx++}`;
    params.push(category_id);
  }
  if (from) {
    clause += ` AND t.date >= $${paramIdx++}`;
    params.push(from);
  }
  if (to) {
    clause += ` AND t.date <= $${paramIdx++}`;
    params.push(to);
  }
  if (search) {
    clause += ` AND (t.description ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx + 1})`;
    params.push(`%${search}%`, `%${search}%`);
    paramIdx += 2;
  }

  return { clause, params, nextParamIdx: paramIdx };
}

function parsePagination(query: Request['query']) {
  const rawLimit = parseInt(query.limit as string, 10);
  const rawOffset = parseInt(query.offset as string, 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  return { limit, offset };
}

// GET /api/transactions?type=&category_id=&from=&to=&limit=&offset=
export async function getTransactions(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { clause, params, nextParamIdx } = buildTransactionFilters(req.query, userId);
    const { limit, offset } = parsePagination(req.query);

    const query = `
      SELECT t.*, c.name as category_name, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ${clause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT $${nextParamIdx} OFFSET $${nextParamIdx + 1}
    `;
    const result = await pool.query(query, [...params, limit, offset]);

    const countQuery = `SELECT COUNT(*) FROM transactions t LEFT JOIN categories c ON t.category_id = c.id ${clause}`;
    const countResult = await pool.query(countQuery, params);

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('Error fetching transactions:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

// POST /api/transactions
export async function createTransaction(req: Request, res: Response) {
  try {
    const userId = req.user?.id || null;
    const { type, amount, category_id, description, date } = req.body;

    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, category_id, description, date) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, type, amount, category_id || null, description || null, date || new Date().toISOString().split('T')[0]]
    );

    // Fetch with category info
    const full = await pool.query(
      `SELECT t.*, c.name as category_name, c.icon as category_icon 
       FROM transactions t LEFT JOIN categories c ON t.category_id = c.id 
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(full.rows[0]);
  } catch (err: any) {
    console.error('Error creating transaction:', err.message);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
}

// PUT /api/transactions/:id
export async function updateTransaction(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { type, amount, category_id, description, date } = req.body;

    const userClause = userId ? 'AND (user_id = $7 OR user_id IS NULL)' : '';
    const params = [type, amount, category_id, description, date, id];
    if (userId) params.push(userId as any);

    const result = await pool.query(
      `UPDATE transactions SET 
        type = COALESCE($1, type),
        amount = COALESCE($2, amount),
        category_id = COALESCE($3, category_id),
        description = COALESCE($4, description),
        date = COALESCE($5, date),
        updated_at = NOW()
       WHERE id = $6 ${userClause} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const full = await pool.query(
      `SELECT t.*, c.name as category_name, c.icon as category_icon 
       FROM transactions t LEFT JOIN categories c ON t.category_id = c.id 
       WHERE t.id = $1`,
      [id]
    );

    res.json(full.rows[0]);
  } catch (err: any) {
    console.error('Error updating transaction:', err.message);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
}

// DELETE /api/transactions/:id
export async function deleteTransaction(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const query = userId
      ? 'DELETE FROM transactions WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING id'
      : 'DELETE FROM transactions WHERE id = $1 RETURNING id';
    const params = userId ? [id, userId] : [id];

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted', id: parseInt(id) });
  } catch (err: any) {
    console.error('Error deleting transaction:', err.message);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
}
