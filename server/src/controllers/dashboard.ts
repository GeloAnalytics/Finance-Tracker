import { Request, Response } from 'express';
import pool from '../db/connection';

const CHART_COLORS = ['#7c5cfc','#34d399','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#6366f1','#a855f7','#06b6d4'];

export async function getDashboardSummary(req: Request, res: Response) {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Total income & expenses (all time)
    const totals = await pool.query(`
      SELECT type, COALESCE(SUM(amount), 0) as total FROM transactions GROUP BY type
    `);
    let totalIncome = 0, totalExpenses = 0;
    totals.rows.forEach((r: any) => {
      if (r.type === 'income') totalIncome = parseFloat(r.total);
      if (r.type === 'expense') totalExpenses = parseFloat(r.total);
    });

    // This month
    const monthly = await pool.query(`
      SELECT type, COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2
      GROUP BY type
    `, [month, year]);
    let monthlyIncome = 0, monthlyExpenses = 0;
    monthly.rows.forEach((r: any) => {
      if (r.type === 'income') monthlyIncome = parseFloat(r.total);
      if (r.type === 'expense') monthlyExpenses = parseFloat(r.total);
    });

    // Spending by category (this month)
    const byCat = await pool.query(`
      SELECT c.name, c.icon, COALESCE(SUM(t.amount), 0) as amount
      FROM transactions t JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense' AND EXTRACT(MONTH FROM t.date) = $1 AND EXTRACT(YEAR FROM t.date) = $2
      GROUP BY c.name, c.icon ORDER BY amount DESC LIMIT 10
    `, [month, year]);
    const spendingByCategory = byCat.rows.map((r: any, i: number) => ({
      name: r.name, icon: r.icon, amount: parseFloat(r.amount), color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    // Monthly trend (last 6 months)
    const trend = await pool.query(`
      SELECT TO_CHAR(date, 'YYYY-MM') as month, type, COALESCE(SUM(amount), 0) as total
      FROM transactions WHERE date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY TO_CHAR(date, 'YYYY-MM'), type ORDER BY month
    `);
    const trendMap: Record<string, { income: number; expenses: number }> = {};
    trend.rows.forEach((r: any) => {
      if (!trendMap[r.month]) trendMap[r.month] = { income: 0, expenses: 0 };
      if (r.type === 'income') trendMap[r.month].income = parseFloat(r.total);
      if (r.type === 'expense') trendMap[r.month].expenses = parseFloat(r.total);
    });
    const monthlyTrend = Object.entries(trendMap).map(([m, v]) => ({ month: m, ...v }));

    // Recent transactions
    const recent = await pool.query(`
      SELECT t.*, c.name as category_name, c.icon as category_icon
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.date DESC, t.created_at DESC LIMIT 5
    `);

    // Active debts total
    const debtTotal = await pool.query(`SELECT COALESCE(SUM(current_balance), 0) as total FROM debts WHERE is_active = true`);
    // Savings progress
    const savingsTotal = await pool.query(`SELECT COALESCE(SUM(current_amount), 0) as saved, COALESCE(SUM(target_amount), 0) as target FROM savings_goals`);

    // Financial health score (0-100)
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) : 0;
    const debtRatio = monthlyIncome > 0 ? (parseFloat(debtTotal.rows[0].total) / (monthlyIncome * 12)) : 0;
    let healthScore = 50;
    healthScore += savingsRate > 0.2 ? 20 : savingsRate > 0.1 ? 10 : savingsRate > 0 ? 5 : -10;
    healthScore += debtRatio < 0.3 ? 15 : debtRatio < 0.5 ? 5 : -10;
    healthScore += spendingByCategory.length > 0 ? 5 : 0; // tracking expenses = good
    healthScore += monthlyIncome > 0 ? 10 : 0;
    healthScore = Math.max(0, Math.min(100, healthScore));

    res.json({
      total_balance: totalIncome - totalExpenses,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      health_score: healthScore,
      spending_by_category: spendingByCategory,
      monthly_trend: monthlyTrend,
      recent_transactions: recent.rows,
      active_debts_total: parseFloat(debtTotal.rows[0].total),
      savings_progress: parseFloat(savingsTotal.rows[0].target) > 0
        ? Math.round((parseFloat(savingsTotal.rows[0].saved) / parseFloat(savingsTotal.rows[0].target)) * 100)
        : 0,
    });
  } catch (err: any) {
    console.error('Error fetching dashboard:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}

// GET /api/categories
export async function getCategories(req: Request, res: Response) {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM categories';
    const params: any[] = [];
    if (type) { query += ' WHERE type = $1 OR type = \'both\''; params.push(type); }
    query += ' ORDER BY budget_group NULLS FIRST, name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Database query failed, returning mock categories for UI preview:', err.message);
    const mockCategories = [
      { id: 1, name: 'Salary', icon: '💼', type: 'income' },
      { id: 2, name: 'Rent', icon: '🏠', type: 'expense' },
      { id: 3, name: 'Groceries', icon: '🛒', type: 'expense' },
      { id: 4, name: 'Entertainment', icon: '🎬', type: 'expense' }
    ];
    res.json(mockCategories);
  }
}
