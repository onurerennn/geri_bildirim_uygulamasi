import express from 'express';
import {
    register,
    login,
    logout,
    getMe,
    getUserProfile,
    createSuperAdmin,
    getBusinessCustomers
} from '../controllers/authController';
import { protect, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../types/UserRole';

const router = express.Router();

// Açık rotalar
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Korumalı rotalar
router.get('/me', protect, getMe);
router.get('/profile', protect, getUserProfile);

// Admin rotaları
router.post('/create-super-admin', protect, authorize(UserRole.SUPER_ADMIN), createSuperAdmin);

// İşletme admin rotaları
router.get('/business/:businessId/customers', protect, authorize(UserRole.BUSINESS_ADMIN), getBusinessCustomers);

export default router; 