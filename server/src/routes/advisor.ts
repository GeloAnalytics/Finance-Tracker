import { Router } from 'express';
import { chat, getHistory, clearHistory } from '../controllers/advisor';
import { validateBody } from '../middleware/validate';
import { advisorChatSchema } from '../validation/schemas';

const router = Router();

router.post('/chat', validateBody(advisorChatSchema), chat);
router.get('/history', getHistory);
router.delete('/history', clearHistory);

export default router;
