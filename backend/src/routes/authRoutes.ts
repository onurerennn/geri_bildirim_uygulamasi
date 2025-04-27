import express from 'express';
import { register, login, getMe, createSuperAdmin } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getMe);
router.get('/create-super-admin', createSuperAdmin);

export default router; 