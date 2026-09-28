import { Request, Response } from 'express';
import pool from '../db/connection';

export const ALLOWED_BUDGET_GROUPS = ['needs', 'wants', 'tithes', 'savings', 'debt_payments'] as const;

export interface AllocationItem {
  group_key: typeof ALLOWED_BUDGET_GROUPS[number];
  percentage: number;
}

export const DEFAULT_ALLOCATIONS: AllocationItem[] = [
  { group_key: 'needs', percentage: 50 },
  { group_key: 'wants', percentage: 30 },
  { group_key: 'savings', percentage: 20 },
];

export async function fetchUserAllocations(userId?: number): Promise<AllocationItem[]> {
  if (!userId) return DEFAULT_ALLOCATIONS;
  try {
    const res = await pool.query(
      'SELECT group_key, percentage FROM user_budget_allocations WHERE user_id = $1 ORDER BY id ASC',
      [userId]
    );
    if (res?.rows?.length > 0) {
      return res.rows.map((r: any) => ({
        group_key: r.group_key,
        percentage: parseFloat(r.percentage),
      }));
    }
  } catch (err: any) {
    console.error('Error reading user budget allocations:', err.message);
  }
  return DEFAULT_ALLOCATIONS;
}

// GET /api/budgets/allocation
export async function getAllocation(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const allocations = await fetchUserAllocations(userId);
    res.json({ allocations });
  } catch (err: any) {
    console.error('Error fetching budget allocation:', err.message);
    res.status(500).json({ error: 'Failed to fetch budget allocations' });
  }
}

// PUT /api/budgets/allocation
export async function updateAllocation(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { allocations } = req.body;
    if (!Array.isArray(allocations)) {
      return res.status(400).json({ error: 'Allocations must be an array' });
    }

    if (allocations.length < 3 || allocations.length > 5) {
      return res.status(400).json({ error: 'You must select between 3 and 5 budget groups' });
    }

    const seenGroups = new Set<string>();
    let totalPercentage = 0;

    for (const item of allocations) {
      if (!item.group_key || !ALLOWED_BUDGET_GROUPS.includes(item.group_key)) {
        return res.status(400).json({ error: `Invalid budget group: ${item.group_key}` });
      }
      if (seenGroups.has(item.group_key)) {
        return res.status(400).json({ error: `Duplicate budget group: ${item.group_key}` });
      }
      seenGroups.add(item.group_key);

      const pct = parseFloat(item.percentage);
      if (isNaN(pct) || pct <= 0) {
        return res.status(400).json({ error: `Percentage for ${item.group_key} must be greater than 0` });
      }
      totalPercentage += pct;
    }

    if (Math.abs(totalPercentage - 100) > 0.01) {
      return res.status(400).json({ error: `Total percentage must equal 100% (currently ${totalPercentage}%)` });
    }

    // Save allocations to DB inside transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_budget_allocations WHERE user_id = $1', [userId]);

      for (const item of allocations) {
        await client.query(
          'INSERT INTO user_budget_allocations (user_id, group_key, percentage) VALUES ($1, $2, $3)',
          [userId, item.group_key, parseFloat(item.percentage)]
        );
      }
      await client.query('COMMIT');
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const updated = await fetchUserAllocations(userId);
    res.json({ ok: true, allocations: updated });
  } catch (err: any) {
    console.error('Error updating budget allocations:', err.message);
    res.status(500).json({ error: 'Failed to save budget allocations' });
  }
}

// GET /api/budgets?month=&year=
export async function getBudgets(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const now = new Date();
    const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
    const year = parseInt(req.query.year as string) || now.getFullYear();

    const userWhereBudget = userId ? 'b.user_id = $3' : '1=1';
    const userWhereSpent = userId ? 'user_id = $3' : '1=1';
    const params = userId ? [month, year, userId] : [month, year];

    // Get user custom or default allocations
    const allocations = await fetchUserAllocations(userId);

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
          AND ${userWhereSpent}
          AND EXTRACT(MONTH FROM date) = $1
          AND EXTRACT(YEAR FROM date) = $2
        GROUP BY category_id
      ) spent ON b.category_id = spent.category_id
      WHERE ${userWhereBudget} AND b.month = $1 AND b.year = $2
      ORDER BY c.budget_group, c.name
    `, params);

    const totalBudget = result.rows.reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0);

    // Dynamic group rollups based on user allocations
    const groupsSummary: Record<string, { budget: number; spent: number; target_pct: number }> = {};

    allocations.forEach(alloc => {
      groupsSummary[alloc.group_key] = {
        budget: 0,
        spent: 0,
        target_pct: alloc.percentage,
      };
    });

    result.rows.forEach((b: any) => {
      const gKey = b.budget_group as string;
      if (gKey && groupsSummary[gKey]) {
        groupsSummary[gKey].budget += parseFloat(b.amount);
        groupsSummary[gKey].spent += parseFloat(b.spent);
      }
    });

    res.json({
      data: result.rows,
      month,
      year,
      total_budget: totalBudget,
      allocations,
      groups: groupsSummary,
    });
  } catch (err: any) {
    console.error('Error fetching budgets:', err.message);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
}

// POST /api/budgets
export async function createBudget(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { category_id, amount, month, year } = req.body;

    const result = await pool.query(`
      INSERT INTO budgets (user_id, category_id, amount, month, year)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, category_id, month, year)
      DO UPDATE SET amount = $3, updated_at = NOW()
      RETURNING *
    `, [userId, category_id, amount, month, year]);

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
    const userId = req.user?.id;
    const { id } = req.params;
    const query = userId
      ? 'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id'
      : 'DELETE FROM budgets WHERE id = $1 RETURNING id';
    const params = userId ? [id, userId] : [id];

    const result = await pool.query(query, params);
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
    const userId = req.user?.id;
    const income = parseFloat(req.query.income as string) || 0;
    const allocations = await fetchUserAllocations(userId);

    const suggestion: Record<string, { amount: number; percentage: number; description: string }> = {};
    
    const descriptions: Record<string, string> = {
      needs: 'Essential expenses: rent, food, utilities, transport',
      wants: 'Non-essentials: dining out, entertainment, shopping',
      tithes: 'Tithes, church, giving, and charitable donations',
      savings: 'Savings, investments, and emergency fund',
      debt_payments: 'Debt payoff and credit card payments',
    };

    allocations.forEach(alloc => {
      suggestion[alloc.group_key] = {
        amount: Math.round((income * (alloc.percentage / 100)) * 100) / 100,
        percentage: alloc.percentage,
        description: descriptions[alloc.group_key] || '',
      };
    });

    const categories = await pool.query(`
      SELECT id, name, icon, budget_group 
      FROM categories 
      WHERE type = 'expense' AND budget_group IS NOT NULL
      ORDER BY budget_group, name
    `);

    res.json({
      total_income: income,
      allocations,
      suggestion,
      categories: categories.rows,
    });
  } catch (err: any) {
    console.error('Error suggesting budgets:', err.message);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
}
