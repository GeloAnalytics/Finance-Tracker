import { Router } from 'express';
import { getDebts, createDebt, updateDebt, deleteDebt, getPayoffPlan } from '../controllers/debts';

const router = Router();

router.get('/', getDebts);
router.post('/', createDebt);
router.put('/:id', updateDebt);
router.delete('/:id', deleteDebt);
router.get('/payoff', getPayoffPlan);

export default router;
