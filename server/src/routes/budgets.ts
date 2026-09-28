import { Router } from 'express';
import { getBudgets, createBudget, deleteBudget, suggestBudgets, getAllocation, updateAllocation } from '../controllers/budgets';
import { validateBody } from '../middleware/validate';
import { createBudgetSchema } from '../validation/schemas';

const router = Router();

// IMPORTANT: specific routes must be registered BEFORE parameterized ones
router.get('/allocation', getAllocation);
router.put('/allocation', updateAllocation);
router.get('/suggest', suggestBudgets);
router.get('/', getBudgets);
router.post('/', validateBody(createBudgetSchema), createBudget);
router.delete('/:id', deleteBudget);

export default router;
