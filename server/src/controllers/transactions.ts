import { Request, Response } from 'express';
import pool from '../db/connection';

// GET /api/transactions?type=&category_id=&from=&to=&limit=&offset=
export async function getTransactions(req: Request, res: Response) {
  try {
    const { type, category_id, from, to, limit = '50', offset = '0', search } = req.query;
    let query = `
      SELECT t.*, c.name as category_name, c.icon as category_icon 
      FROM transactions t 
      LEFT JOIN categories c ON t.category_id = c.id 
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (type) {
      query += ` AND t.type = $${paramIdx++}`;
      params.push(type);
    }
    if (category_id) {
      query += ` AND t.category_id = $${paramIdx++}`;
      params.push(category_id);
    }
    if (from) {
      query += ` AND t.date >= $${paramIdx++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND t.date <= $${paramIdx++}`;
      params.push(to);
    }
    if (search) {
      query += ` AND (t.description ILIKE $${paramIdx++} OR c.name ILIKE $${paramIdx++})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC`;
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    // Also get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE 1=1`;
    const countParams: any[] = [];
    let countIdx = 1;
    if (type) { countQuery += ` AND t.type = $${countIdx++}`; countParams.push(type); }
    if (category_id) { countQuery += ` AND t.category_id = $${countIdx++}`; countParams.push(category_id); }
    if (from) { countQuery += ` AND t.date >= $${countIdx++}`; countParams.push(from); }
    if (to) { countQuery += ` AND t.date <= $${countIdx++}`; countParams.push(to); }
    if (search) {
      countQuery += ` AND (t.description ILIKE $${countIdx++} OR c.name ILIKE $${countIdx++})`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (err: any) {
    console.error('Error fetching transactions:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

// POST /api/transactions
export async function createTransaction(req: Request, res: Response) {
  try {
    const { type, amount, category_id, description, date } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ error: 'Type and amount are required' });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Type must be income or expense' });
    }
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const result = await pool.query(
      `INSERT INTO transactions (type, amount, category_id, description, date) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, amount, category_id || null, description || null, date || new Date().toISOString().split('T')[0]]
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
    const { id } = req.params;
    const { type, amount, category_id, description, date } = req.body;

    const result = await pool.query(
      `UPDATE transactions SET 
        type = COALESCE($1, type),
        amount = COALESCE($2, amount),
        category_id = COALESCE($3, category_id),
        description = COALESCE($4, description),
        date = COALESCE($5, date),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [type, amount, category_id, description, date, id]
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
    const { id } = req.params;
    const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted', id: parseInt(id) });
  } catch (err: any) {
    console.error('Error deleting transaction:', err.message);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
}
