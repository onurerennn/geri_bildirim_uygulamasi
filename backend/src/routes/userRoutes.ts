import express from 'express';
import {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getUserProfile,
    getBusinessCustomers,
    updateRewardPoints,
    useRewardPoints
} from '../controllers/userController';
import { protect } from '../middleware/auth';
import { checkRole } from '../middleware/roleAuth';
import { UserRole } from '../types/UserRole';

const router = express.Router();

// Tüm rotalar için authentication gerekli
router.use(protect);

// Profil rotaları - tüm kullanıcılar için erişilebilir
router.get('/profile', getUserProfile);

// Müşteri ve puan yönetimi - işletme yöneticileri ve süper admin için
router.get('/business/:businessId/customers', checkRole([UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN]), getBusinessCustomers);
router.patch('/:userId/reward-points', checkRole([UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN]), updateRewardPoints);
router.post('/use-points', checkRole([UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN]), useRewardPoints);

// Admin ve Super Admin rotaları
router.get('/', checkRole([UserRole.SUPER_ADMIN]), getUsers);
router.get('/:id', checkRole([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), getUser);
router.post('/', checkRole([UserRole.SUPER_ADMIN]), createUser);
router.put('/:id', checkRole([UserRole.SUPER_ADMIN]), updateUser);
router.delete('/:id', checkRole([UserRole.SUPER_ADMIN]), deleteUser);

export default router; 