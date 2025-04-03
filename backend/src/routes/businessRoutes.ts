import express from 'express';
import * as businessController from '../controllers/businessController';
import { auth } from '../middleware/auth';
import { isAdminOrSuperAdmin, isSuperAdmin } from '../middleware/roleAuth';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get all businesses (Super Admin and Business Admin only)
router.get('/', isAdminOrSuperAdmin, businessController.getBusinesses);

// Get single business (Super Admin and Business Admin only)
router.get('/:id', isAdminOrSuperAdmin, businessController.getBusiness);

// Create business (Super Admin only)
router.post('/', isSuperAdmin, businessController.createBusiness);

// Update business (Super Admin only)
router.put('/:id', isSuperAdmin, businessController.updateBusiness);

// Delete business (Super Admin only)
router.delete('/:id', isSuperAdmin, businessController.deleteBusiness);

// Approve business (Super Admin only)
router.post('/:id/approve', isSuperAdmin, businessController.approveBusiness);

export default router; 