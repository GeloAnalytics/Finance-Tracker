import { Request, Response } from 'express';
import pool from '../db/connection';

// GET /api/bills?item_type=bill|to_buy&status=pending|completed
export async function getBills(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { item_type, status } = req.query;

    let query = `
      SELECT b.*, c.name as category_name, c.icon as category_icon
      FROM bills_and_items b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIdx = 2;

    if (item_type && (item_type === 'bill' || item_type === 'to_buy')) {
      query += ` AND b.item_type = $${paramIdx++}`;
      params.push(item_type);
    }

    if (status && (status === 'pending' || status === 'completed')) {
      query += ` AND b.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY b.status ASC, b.due_date ASC NULLS LAST, b.created_at DESC';

    const result = await pool.query(query, params);

    // Compute totals
    const totalsQuery = await pool.query(`
      SELECT 
        item_type,
        COALESCE(SUM(amount), 0) as total
      FROM bills_and_items
      WHERE user_id = $1 AND status = 'pending'
      GROUP BY item_type
    `, [userId]);

    let totalPendingBills = 0;
    let totalPendingToBuy = 0;

    totalsQuery.rows.forEach((r: any) => {
      if (r.item_type === 'bill') totalPendingBills = parseFloat(r.total);
      if (r.item_type === 'to_buy') totalPendingToBuy = parseFloat(r.total);
    });

    res.json({
      data: result.rows,
      total_pending_bills: totalPendingBills,
      total_pending_to_buy: totalPendingToBuy,
    });
  } catch (err: any) {
    console.error('Error fetching bills & to-buy items:', err.message);
    res.status(500).json({ error: 'Failed to fetch bills & items' });
  }
}

// POST /api/bills
export async function createBill(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { item_type, name, amount, due_date, category_id, notes } = req.body;

    if (!item_type || (item_type !== 'bill' && item_type !== 'to_buy')) {
      return res.status(400).json({ error: "Item type must be either 'bill' or 'to_buy'" });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    if (typeof amount !== 'number' && typeof amount !== 'string') {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const numericAmount = parseFloat(amount as string);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ error: 'Amount must be a non-negative number' });
    }

    const result = await pool.query(
      `INSERT INTO bills_and_items (user_id, item_type, name, amount, due_date, category_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, item_type, name.trim(), numericAmount, due_date || null, category_id || null, notes || null]
    );

    const full = await pool.query(
      `SELECT b.*, c.name as category_name, c.icon as category_icon
       FROM bills_and_items b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(full.rows[0]);
  } catch (err: any) {
    console.error('Error creating bill / item:', err.message);
    res.status(500).json({ error: 'Failed to create item' });
  }
}

// PUT /api/bills/:id
export async function updateBill(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, amount, due_date, category_id, status, notes } = req.body;

    const userClause = userId ? 'AND user_id = $7' : '';
    const params = [name, amount, due_date, category_id, status, notes, id];
    if (userId) params.push(userId as any);

    const result = await pool.query(
      `UPDATE bills_and_items SET
        name = COALESCE($1, name),
        amount = COALESCE($2, amount),
        due_date = COALESCE($3, due_date),
        category_id = COALESCE($4, category_id),
        status = COALESCE($5, status),
        notes = COALESCE($6, notes),
        updated_at = NOW()
       WHERE id = $7 ${userClause} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const full = await pool.query(
      `SELECT b.*, c.name as category_name, c.icon as category_icon
       FROM bills_and_items b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = $1`,
      [id]
    );

    res.json(full.rows[0]);
  } catch (err: any) {
    console.error('Error updating bill / item:', err.message);
    res.status(500).json({ error: 'Failed to update item' });
  }
}

// DELETE /api/bills/:id
export async function deleteBill(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const query = userId
      ? 'DELETE FROM bills_and_items WHERE id = $1 AND user_id = $2 RETURNING id'
      : 'DELETE FROM bills_and_items WHERE id = $1 RETURNING id';
    const params = userId ? [id, userId] : [id];

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted', id: parseInt(id) });
  } catch (err: any) {
    console.error('Error deleting bill / item:', err.message);
    res.status(500).json({ error: 'Failed to delete item' });
  }
}

// POST /api/bills/:id/pay-or-buy (Mark completed & optional expense transaction creation)
export async function payOrBuyItem(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { create_transaction } = req.body;

    // Only a pending item can create a payment transaction.  Besides making
    // the action idempotent, this prevents a double-click/retry from recording
    // the same bill twice.
    const itemRes = await pool.query(
      `UPDATE bills_and_items SET status = 'completed', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING *`,
      [id, userId]
    );

    if (itemRes.rows.length === 0) {
      const existing = await pool.query('SELECT status FROM bills_and_items WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.status(existing.rows.length ? 409 : 404).json({ error: existing.rows.length ? 'Item has already been completed' : 'Item not found' });
    }

    const item = itemRes.rows[0];
    let createdTx = null;

    if (create_transaction !== false) {
      const desc = item.item_type === 'bill' ? `Paid Bill: ${item.name}` : `Purchased Item: ${item.name}`;
      const txRes = await pool.query(
        `INSERT INTO transactions (user_id, type, amount, category_id, description, date)
         VALUES ($1, 'expense', $2, $3, $4, CURRENT_DATE) RETURNING *`,
        [userId, item.amount, item.category_id || null, desc]
      );
      createdTx = txRes.rows[0];
    }

    const fullItem = await pool.query(
      `SELECT b.*, c.name as category_name, c.icon as category_icon
       FROM bills_and_items b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = $1`,
      [id]
    );

    res.json({
      item: fullItem.rows[0],
      transaction: createdTx,
    });
  } catch (err: any) {
    console.error('Error completing bill / purchase:', err.message);
    res.status(500).json({ error: 'Failed to process item completion' });
  }
}
