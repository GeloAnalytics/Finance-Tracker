import { Router } from 'express';
import { getBudgets, createBudget, deleteBudget, suggestBudgets } from '../controllers/budgets';

const router = Router();

// IMPORTANT: specific routes must be registered BEFORE parameterized ones
router.get('/suggest', suggestBudgets);
router.get('/', getBudgets);
router.post('/', createBudget);
router.delete('/:id', deleteBudget);

export default router;
