import { Request, Response } from 'express';
import pool from '../db/connection';

// GET /api/budgets?month=&year=
export async function getBudgets(req: Request, res: Response) {
  try {
    const now = new Date();
    const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
    const year = parseInt(req.query.year as string) || now.getFullYear();

    // Get budgets with spent amounts
    const result = await pool.query(`
      SELECT 
        b.id, b.category_id, b.amount, b.month, b.year,
        c.name as category_name, c.icon as category_icon, c.budget_group,
        COALESCE(spent.total, 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN (
        SELECT category_id, SUM(amount) as total
        FROM transactions
        WHERE type = 'expense'
          AND EXTRACT(MONTH FROM date) = $1
          AND EXTRACT(YEAR FROM date) = $2
        GROUP BY category_id
      ) spent ON b.category_id = spent.category_id
      WHERE b.month = $1 AND b.year = $2
      ORDER BY c.budget_group, c.name
    `, [month, year]);

    // Calculate 50/30/20 summary
    const totalBudget = result.rows.reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0);
    const groups = { needs: 0, wants: 0, savings: 0 };
    const groupSpent = { needs: 0, wants: 0, savings: 0 };

    result.rows.forEach((b: any) => {
      const group = b.budget_group as keyof typeof groups;
      if (group && groups[group] !== undefined) {
        groups[group] += parseFloat(b.amount);
        groupSpent[group] += parseFloat(b.spent);
      }
    });

    res.json({
      data: result.rows,
      month,
      year,
      total_budget: totalBudget,
      groups: {
        needs: { budget: groups.needs, spent: groupSpent.needs, target_pct: 50 },
        wants: { budget: groups.wants, spent: groupSpent.wants, target_pct: 30 },
        savings: { budget: groups.savings, spent: groupSpent.savings, target_pct: 20 },
      },
    });
  } catch (err: any) {
    console.error('Error fetching budgets:', err.message);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
}

// POST /api/budgets
export async function createBudget(req: Request, res: Response) {
  try {
    const { category_id, amount, month, year } = req.body;

    if (!category_id || amount === undefined || !month || !year) {
      return res.status(400).json({ error: 'category_id, amount, month, and year are required' });
    }

    // Upsert — update if exists for this category/month/year
    const result = await pool.query(`
      INSERT INTO budgets (category_id, amount, month, year)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (category_id, month, year)
      DO UPDATE SET amount = $2, updated_at = NOW()
      RETURNING *
    `, [category_id, amount, month, year]);

    // Return with category info
    const full = await pool.query(`
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.budget_group
      FROM budgets b JOIN categories c ON b.category_id = c.id
      WHERE b.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(full.rows[0]);
  } catch (err: any) {
    console.error('Error creating budget:', err.message);
    res.status(500).json({ error: 'Failed to create budget' });
  }
}

// DELETE /api/budgets/:id
export async function deleteBudget(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM budgets WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted', id: parseInt(id) });
  } catch (err: any) {
    console.error('Error deleting budget:', err.message);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
}

// GET /api/budgets/suggest?income=
export async function suggestBudgets(req: Request, res: Response) {
  try {
    const income = parseFloat(req.query.income as string) || 0;

    // 50/30/20 rule
    const suggestion = {
      total_income: income,
      needs: { amount: income * 0.5, percentage: 50, description: 'Essential expenses: rent, food, utilities, transport' },
      wants: { amount: income * 0.3, percentage: 30, description: 'Non-essentials: dining out, entertainment, shopping' },
      savings: { amount: income * 0.2, percentage: 20, description: 'Savings, investments, debt payoff' },
    };

    // Get categories grouped
    const categories = await pool.query(`
      SELECT id, name, icon, budget_group 
      FROM categories 
      WHERE type = 'expense' AND budget_group IS NOT NULL
      ORDER BY budget_group, name
    `);

    res.json({
      suggestion,
      categories: categories.rows,
    });
  } catch (err: any) {
    console.error('Error suggesting budgets:', err.message);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
}
