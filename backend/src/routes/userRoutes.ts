import express from 'express';
import {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
} from '../controllers/userController';
import { protect } from '../middleware/auth';
import { checkRole } from '../middleware/roleAuth';
import { UserRole } from '../types/UserRole';

const router = express.Router();

// Tüm rotalar için authentication gerekli
router.use(protect);

// Admin ve Super Admin rotaları
router.get('/', checkRole([UserRole.SUPER_ADMIN]), getUsers);
router.get('/:id', checkRole([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), getUser);
router.post('/', checkRole([UserRole.SUPER_ADMIN]), createUser);
router.put('/:id', checkRole([UserRole.SUPER_ADMIN]), updateUser);
router.delete('/:id', checkRole([UserRole.SUPER_ADMIN]), deleteUser);

export default router; 