import { Router } from 'express';
import { chat, getHistory, clearHistory } from '../controllers/advisor';

const router = Router();

router.post('/chat', chat);
router.get('/history', getHistory);
router.delete('/history', clearHistory);

export default router;
