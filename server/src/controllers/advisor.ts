import { Request, Response } from 'express';
import pool from '../db/connection';
import { generateAdvisorResponse } from '../services/advisor-engine';

// POST /api/advisor/chat
export async function chat(req: Request, res: Response) {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Save user message
    await pool.query('INSERT INTO chat_messages (role, content) VALUES ($1, $2)', ['user', message.trim()]);

    // Generate response
    const response = await generateAdvisorResponse(message.trim());

    // Save advisor response
    await pool.query('INSERT INTO chat_messages (role, content) VALUES ($1, $2)', ['advisor', response]);

    res.json({ role: 'advisor', content: response });
  } catch (err: any) {
    console.error('Error in advisor chat:', err.message);
    res.status(500).json({ error: 'Failed to process message' });
  }
}

// GET /api/advisor/history?limit=
export async function getHistory(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await pool.query(
      'SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT $1',
      [limit]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching chat history:', err.message);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
}

// DELETE /api/advisor/history
export async function clearHistory(req: Request, res: Response) {
  try {
    await pool.query('DELETE FROM chat_messages');
    res.json({ message: 'Chat history cleared' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
}
