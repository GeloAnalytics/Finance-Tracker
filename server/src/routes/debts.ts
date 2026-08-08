import { Router } from 'express';
import { getDebts, createDebt, updateDebt, deleteDebt, getPayoffPlan } from '../controllers/debts';
import { validateBody } from '../middleware/validate';
import { createDebtSchema, updateDebtSchema } from '../validation/schemas';

const router = Router();

// IMPORTANT: specific routes must be registered BEFORE parameterized ones
router.get('/payoff', getPayoffPlan);
router.get('/', getDebts);
router.post('/', validateBody(createDebtSchema), createDebt);
router.put('/:id', validateBody(updateDebtSchema), updateDebt);
router.delete('/:id', deleteDebt);

export default router;
