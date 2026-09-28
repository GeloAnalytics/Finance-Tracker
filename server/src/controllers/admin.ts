import { Request, Response } from 'express';
import pool from '../db/connection';

function parseUserId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET /api/admin/users
// Deliberately omits password_hash. This is an account directory for support,
// not a way to retrieve credentials.
export async function listUsers(req: Request, res: Response) {
  try {
    const rawLimit = Number(req.query.limit || 50);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 50;
    const rawOffset = Number(req.query.offset || 0);
    const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;
    const result = await pool.query(
      `SELECT id, username, email, role, is_active, created_at, updated_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: result.rows, limit, offset });
  } catch (err: any) {
    console.error('Error listing users:', err.message);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

// GET /api/admin/users/:id/overview
// Explicit, read-only support access. Every access is recorded for later review.
export async function getUserOverview(req: Request, res: Response) {
  const userId = parseUserId(req.params.id);
  if (!userId) return res.status(400).json({ error: 'Invalid user id' });

  try {
    const userResult = await pool.query(
      'SELECT id, username, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const [transactions, budgets, debts, savings, bills] = await Promise.all([
      pool.query(
        `SELECT t.*, c.name AS category_name, c.icon AS category_icon
         FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = $1 ORDER BY t.date DESC, t.created_at DESC LIMIT 200`,
        [userId]
      ),
      pool.query(
        `SELECT b.*, c.name AS category_name, c.icon AS category_icon
         FROM budgets b JOIN categories c ON b.category_id = c.id
         WHERE b.user_id = $1 ORDER BY b.year DESC, b.month DESC, c.name`,
        [userId]
      ),
      pool.query('SELECT * FROM debts WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
      pool.query('SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
      pool.query(
        'SELECT * FROM bills_and_items WHERE user_id = $1 ORDER BY status ASC, due_date ASC NULLS LAST, created_at DESC',
        [userId]
      ),
    ]);

    await pool.query(
      `INSERT INTO admin_access_log (admin_user_id, target_user_id, action, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [req.user!.id, userId, 'view_user_overview', req.ip || null]
    );

    res.json({
      user: userResult.rows[0],
      data: {
        transactions: transactions.rows,
        budgets: budgets.rows,
        debts: debts.rows,
        savings: savings.rows,
        bills: bills.rows,
      },
    });
  } catch (err: any) {
    console.error('Error reading user overview:', err.message);
    res.status(500).json({ error: 'Failed to read user overview' });
  }
}
