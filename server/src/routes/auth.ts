import { Router } from 'express';
import { register, login, logout, me } from '../controllers/auth';
import { loginRateLimit, registerRateLimit } from '../middleware/rate-limit';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validation/schemas';

const router = Router();

router.post('/register', registerRateLimit, validateBody(registerSchema), register);
router.post('/login', loginRateLimit, validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', me);

export default router;
