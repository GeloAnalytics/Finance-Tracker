import { Router } from 'express';
import { getBudgets, createBudget, deleteBudget, suggestBudgets } from '../controllers/budgets';

const router = Router();

router.get('/', getBudgets);
router.post('/', createBudget);
router.delete('/:id', deleteBudget);
router.get('/suggest', suggestBudgets);

export default router;
