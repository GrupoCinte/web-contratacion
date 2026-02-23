import express from 'express';
import { loginUser, verifyToken, logoutUser } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../schemas/auth.js';

const router = express.Router();

router.post('/login', validate(loginSchema), loginUser);
router.post('/logout', logoutUser);
router.get('/verify', requireAuth, verifyToken);

export default router;
