import { Router } from 'express';
import { listUsers, getUserOverview } from '../controllers/admin';

const router = Router();

router.get('/users', listUsers);
router.get('/users/:id/overview', getUserOverview);

export default router;
