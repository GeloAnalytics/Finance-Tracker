import { Request, Response } from 'express';
import pool from '../db/connection';
import { DebtPayoffPlan } from '../types';

// GET /api/debts
export async function getDebts(req: Request, res: Response) {
  try {
    const { active } = req.query;
    let query = 'SELECT * FROM debts';
    const params: any[] = [];

    if (active !== undefined) {
      query += ' WHERE is_active = $1';
      params.push(active === 'true');
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);

    const totalDebt = result.rows
      .filter((d: any) => d.is_active)
      .reduce((sum: number, d: any) => sum + parseFloat(d.current_balance), 0);

    res.json({
      data: result.rows,
      total_debt: totalDebt,
      count: result.rows.length,
    });
  } catch (err: any) {
    console.error('Error fetching debts:', err.message);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
}

// POST /api/debts
export async function createDebt(req: Request, res: Response) {
  try {
    const { name, total_amount, current_balance, interest_rate, minimum_payment, due_date } = req.body;

    if (!name || !total_amount || current_balance === undefined) {
      return res.status(400).json({ error: 'name, total_amount, and current_balance are required' });
    }

    const result = await pool.query(
      `INSERT INTO debts (name, total_amount, current_balance, interest_rate, minimum_payment, due_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, total_amount, current_balance, interest_rate || 0, minimum_payment || 0, due_date || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating debt:', err.message);
    res.status(500).json({ error: 'Failed to create debt' });
  }
}

// PUT /api/debts/:id
export async function updateDebt(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, total_amount, current_balance, interest_rate, minimum_payment, due_date, is_active } = req.body;

    const result = await pool.query(
      `UPDATE debts SET
        name = COALESCE($1, name),
        total_amount = COALESCE($2, total_amount),
        current_balance = COALESCE($3, current_balance),
        interest_rate = COALESCE($4, interest_rate),
        minimum_payment = COALESCE($5, minimum_payment),
        due_date = COALESCE($6, due_date),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [name, total_amount, current_balance, interest_rate, minimum_payment, due_date, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error updating debt:', err.message);
    res.status(500).json({ error: 'Failed to update debt' });
  }
}

// DELETE /api/debts/:id
export async function deleteDebt(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM debts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    res.json({ message: 'Debt deleted', id: parseInt(id) });
  } catch (err: any) {
    console.error('Error deleting debt:', err.message);
    res.status(500).json({ error: 'Failed to delete debt' });
  }
}

// GET /api/debts/payoff?method=snowball|avalanche&extra_payment=
export async function getPayoffPlan(req: Request, res: Response) {
  try {
    const method = (req.query.method as string) || 'snowball';
    const extraPayment = parseFloat(req.query.extra_payment as string) || 0;

    const debtsResult = await pool.query(
      'SELECT * FROM debts WHERE is_active = true AND current_balance > 0 ORDER BY id'
    );

    if (debtsResult.rows.length === 0) {
      return res.json({ method, total_months: 0, total_interest: 0, total_paid: 0, order: [], monthly_schedule: [] });
    }

    // Clone debts for calculation
    let debts = debtsResult.rows.map((d: any) => ({
      name: d.name,
      balance: parseFloat(d.current_balance),
      rate: parseFloat(d.interest_rate) / 100 / 12, // monthly rate
      minPayment: parseFloat(d.minimum_payment),
    }));

    // Sort by method
    if (method === 'snowball') {
      debts.sort((a, b) => a.balance - b.balance); // smallest first
    } else {
      debts.sort((a, b) => b.rate - a.rate); // highest rate first
    }

    const order = debts.map(d => ({ name: d.name, balance: d.balance, rate: d.rate * 12 * 100 }));

    let totalInterest = 0;
    let totalPaid = 0;
    let month = 0;
    const maxMonths = 360; // 30 year cap

    // Simulate payoff
    const schedule: any[] = [];
    let activeDebts = debts.map(d => ({ ...d }));

    while (activeDebts.some(d => d.balance > 0) && month < maxMonths) {
      month++;
      const monthPayments: any[] = [];
      let availableExtra = extraPayment;

      // Apply interest first
      activeDebts.forEach(d => {
        if (d.balance > 0) {
          const interest = d.balance * d.rate;
          d.balance += interest;
          totalInterest += interest;
        }
      });

      // Make minimum payments
      activeDebts.forEach(d => {
        if (d.balance > 0) {
          const payment = Math.min(d.minPayment, d.balance);
          d.balance -= payment;
          totalPaid += payment;
          monthPayments.push({ debt_name: d.name, payment, remaining: Math.max(0, d.balance) });
        }
      });

      // Apply extra to first debt (target debt based on method)
      for (const d of activeDebts) {
        if (d.balance > 0 && availableExtra > 0) {
          const extra = Math.min(availableExtra, d.balance);
          d.balance -= extra;
          totalPaid += extra;
          availableExtra -= extra;
          // Update the payment record
          const record = monthPayments.find(p => p.debt_name === d.name);
          if (record) {
            record.payment += extra;
            record.remaining = Math.max(0, d.balance);
          }
          if (d.balance <= 0) continue; // Move freed payment to next debt
          break;
        }
      }

      // When a debt is paid off, its min payment becomes extra for the next
      activeDebts.forEach(d => {
        if (d.balance <= 0.01) {
          d.balance = 0;
        }
      });

      if (month <= 24 || month % 6 === 0) { // Limit schedule detail
        schedule.push({ month, payments: monthPayments });
      }
    }

    const plan: DebtPayoffPlan = {
      method: method as 'snowball' | 'avalanche',
      total_months: month,
      total_interest: Math.round(totalInterest * 100) / 100,
      total_paid: Math.round(totalPaid * 100) / 100,
      order,
      monthly_schedule: schedule,
    };

    res.json(plan);
  } catch (err: any) {
    console.error('Error calculating payoff:', err.message);
    res.status(500).json({ error: 'Failed to calculate payoff plan' });
  }
}
