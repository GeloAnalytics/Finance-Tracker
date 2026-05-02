import { Router } from 'express';
import { getDashboardSummary, getCategories } from '../controllers/dashboard';

const router = Router();

router.get('/summary', getDashboardSummary);
router.get('/categories', getCategories);

export default router;
