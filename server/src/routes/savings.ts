import { Router } from 'express';
import { getSavingsGoals, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal, contributeSavings } from '../controllers/savings';
import { validateBody } from '../middleware/validate';
import { createSavingsGoalSchema, updateSavingsGoalSchema, contributeSavingsSchema } from '../validation/schemas';

const router = Router();

router.get('/', getSavingsGoals);
router.post('/', validateBody(createSavingsGoalSchema), createSavingsGoal);
router.put('/:id', validateBody(updateSavingsGoalSchema), updateSavingsGoal);
router.delete('/:id', deleteSavingsGoal);
router.post('/:id/contribute', validateBody(contributeSavingsSchema), contributeSavings);

export default router;
