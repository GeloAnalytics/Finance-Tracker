import { Router } from 'express';
import { register, login, logout, me } from '../controllers/auth';
import { loginRateLimit } from '../middleware/rate-limit';

const router = Router();

router.post('/register', register);
router.post('/login', loginRateLimit, login);
router.post('/logout', logout);
router.get('/me', me);

export default router;
