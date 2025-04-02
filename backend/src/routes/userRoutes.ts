import express from 'express';
import * as userController from '../controllers/userController';
import { checkRole, isAdminOrSuperAdmin } from '../middleware/roleAuth';

const router = express.Router();

// Get all users (Super Admin and Business Admin only)
router.get('/', isAdminOrSuperAdmin, userController.getUsers);

// Get single user by ID (Super Admin and Business Admin only)
router.get('/:id', isAdminOrSuperAdmin, userController.getUser);

// Create new user (Super Admin can create any role, Business Admin can only create customers)
router.post('/', isAdminOrSuperAdmin, userController.createUser);

// Update user (Super Admin can update any user, Business Admin can only update customers)
router.put('/:id', isAdminOrSuperAdmin, userController.updateUser);

// Delete user (Super Admin can delete any user except themselves, Business Admin can only delete customers)
router.delete('/:id', isAdminOrSuperAdmin, userController.deleteUser);

export default router; 