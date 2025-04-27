import express from 'express';
import {
    getBusinesses,
    getBusiness,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    approveBusiness,
    addBusinessAdmin,
    createDefaultBusiness
} from '../controllers/businessController';
import { protect, authorize } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleAuth';
import { UserRole } from '../types/UserRole';

const router = express.Router();

// Public routes (for development only)
router.post('/create-default', createDefaultBusiness);

// Protected routes
router.get('/', protect, authorize([UserRole.SUPER_ADMIN]), getBusinesses);
router.post('/', protect, authorize([UserRole.SUPER_ADMIN]), createBusiness);
router.post('/:id/approve', protect, authorize([UserRole.SUPER_ADMIN]), approveBusiness);
router.post('/:id/admin', protect, authorize([UserRole.SUPER_ADMIN]), addBusinessAdmin);
router.put('/:id', protect, authorize([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), updateBusiness);
router.delete('/:id', protect, authorize([UserRole.SUPER_ADMIN]), deleteBusiness);

// BUSINESS_ADMIN ve SUPER_ADMIN rotaları
router.get('/:id', protect, authorize([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), getBusiness);

export default router; 