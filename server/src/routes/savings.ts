import { Router } from 'express';
import { getSavingsGoals, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal, contributeSavings } from '../controllers/savings';

const router = Router();

router.get('/', getSavingsGoals);
router.post('/', createSavingsGoal);
router.put('/:id', updateSavingsGoal);
router.delete('/:id', deleteSavingsGoal);
router.post('/:id/contribute', contributeSavings);

export default router;
