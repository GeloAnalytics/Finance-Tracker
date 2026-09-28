import { Request, Response } from 'express';
import pool from '../db/connection';
import { generateAdvisorResponse } from '../services/advisor-engine';

// POST /api/advisor/chat
export async function chat(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Save user message
    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [userId, 'user', message.trim()]
    );

    // Generate response
    const response = await generateAdvisorResponse(message.trim(), userId || undefined);

    // Save advisor response
    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [userId, 'advisor', response]
    );

    res.json({ role: 'advisor', content: response });
  } catch (err: any) {
    console.error('Error in advisor chat:', err.message);
    res.status(500).json({ error: 'Failed to process message' });
  }
}

// GET /api/advisor/history?limit=
export async function getHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const parsedLimit = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;

    const query = userId
      ? 'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2'
      : 'SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT $1';
    const params = userId ? [userId, limit] : [limit];

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching chat history:', err.message);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
}

// DELETE /api/advisor/history
export async function clearHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const query = userId
      ? 'DELETE FROM chat_messages WHERE user_id = $1'
      : 'DELETE FROM chat_messages';
    const params = userId ? [userId] : [];

    await pool.query(query, params);
    res.json({ message: 'Chat history cleared' });
  } catch (err: any) {
    console.error('Error clearing chat history:', err.message);
    res.status(500).json({ error: 'Failed to clear history' });
  }
}
