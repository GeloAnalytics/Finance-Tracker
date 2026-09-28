import { Request, Response } from 'express';
import pool from '../db/connection';

// GET /api/savings
export async function getSavingsGoals(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const query = userId
      ? 'SELECT * FROM savings_goals WHERE (user_id = $1 OR user_id IS NULL) ORDER BY is_completed ASC, created_at DESC'
      : 'SELECT * FROM savings_goals ORDER BY is_completed ASC, created_at DESC';
    const params = userId ? [userId] : [];

    const result = await pool.query(query, params);
    const totalSaved = result.rows.reduce((sum: number, g: any) => sum + parseFloat(g.current_amount), 0);
    const totalTarget = result.rows.reduce((sum: number, g: any) => sum + parseFloat(g.target_amount), 0);
    res.json({
      data: result.rows,
      total_saved: totalSaved,
      total_target: totalTarget,
      overall_progress: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
    });
  } catch (err: any) {
    console.error('Error fetching savings goals:', err.message);
    res.status(500).json({ error: 'Failed to fetch savings goals' });
  }
}

// POST /api/savings
export async function createSavingsGoal(req: Request, res: Response) {
  try {
    const userId = req.user?.id || null;
    const { name, target_amount, current_amount, deadline, icon } = req.body;
    const result = await pool.query(
      `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, deadline, icon)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, name, target_amount, current_amount || 0, deadline ?? null, icon || '🎯']
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating savings goal:', err.message);
    res.status(500).json({ error: 'Failed to create savings goal' });
  }
}

// PUT /api/savings/:id
export async function updateSavingsGoal(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, target_amount, current_amount, deadline, icon, is_completed } = req.body;

    const userClause = userId ? 'AND (user_id = $7 OR user_id IS NULL)' : '';
    const params = [name, target_amount, current_amount, deadline, icon, is_completed, id];
    if (userId) params.push(userId as any);

    const result = await pool.query(
      `UPDATE savings_goals SET
        name = COALESCE($1, name), target_amount = COALESCE($2, target_amount),
        current_amount = COALESCE($3, current_amount), deadline = COALESCE($4, deadline),
        icon = COALESCE($5, icon), is_completed = COALESCE($6, is_completed), updated_at = NOW()
       WHERE id = $7 ${userClause} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Savings goal not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error updating savings goal:', err.message);
    res.status(500).json({ error: 'Failed to update savings goal' });
  }
}

// DELETE /api/savings/:id
export async function deleteSavingsGoal(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const query = userId
      ? 'DELETE FROM savings_goals WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING id'
      : 'DELETE FROM savings_goals WHERE id = $1 RETURNING id';
    const params = userId ? [id, userId] : [id];

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Savings goal not found' });
    res.json({ message: 'Savings goal deleted', id: parseInt(id) });
  } catch (err: any) {
    console.error('Error deleting savings goal:', err.message);
    res.status(500).json({ error: 'Failed to delete savings goal' });
  }
}

// POST /api/savings/:id/contribute
export async function contributeSavings(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { amount } = req.body;
    const userClause = userId ? 'AND (user_id = $3 OR user_id IS NULL)' : '';
    const params = userId ? [amount, id, userId] : [amount, id];

    const result = await pool.query(
      `UPDATE savings_goals SET current_amount = current_amount + $1,
        is_completed = CASE WHEN current_amount + $1 >= target_amount THEN true ELSE false END,
        updated_at = NOW() WHERE id = $2 ${userClause} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Savings goal not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error contributing to savings goal:', err.message);
    res.status(500).json({ error: 'Failed to contribute to savings goal' });
  }
}
