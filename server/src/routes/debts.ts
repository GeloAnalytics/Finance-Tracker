import { Router } from 'express';
import { getDebts, createDebt, updateDebt, deleteDebt, getPayoffPlan } from '../controllers/debts';

const router = Router();

// IMPORTANT: specific routes must be registered BEFORE parameterized ones
router.get('/payoff', getPayoffPlan);
router.get('/', getDebts);
router.post('/', createDebt);
router.put('/:id', updateDebt);
router.delete('/:id', deleteDebt);

export default router;
