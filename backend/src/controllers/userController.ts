import { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import { User } from '../models/User';
import { UserRole } from '../types/enums';

// Get all users
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find(
            req.user.role === UserRole.BUSINESS_ADMIN
                ? { businessId: req.user.businessId }
                : {}
        ).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

// Get single user
export const getUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Business Admin can only view users from their business
        if (
            req.user.role === UserRole.BUSINESS_ADMIN &&
            user.businessId !== req.user.businessId
        ) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user' });
    }
};

// Create user
export const createUser = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, businessId } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Business Admin can only create customers
        if (
            req.user.role === UserRole.BUSINESS_ADMIN &&
            role !== UserRole.CUSTOMER
        ) {
            return res.status(403).json({ message: 'Can only create customer accounts' });
        }

        // Hash password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            businessId: req.user.role === UserRole.BUSINESS_ADMIN ? req.user.businessId : businessId,
        });

        await user.save();
        const { password: _, ...userResponse } = user.toObject();
        res.status(201).json(userResponse);
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, businessId, isActive } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Business Admin restrictions
        if (req.user.role === UserRole.BUSINESS_ADMIN) {
            if (user.businessId !== req.user.businessId) {
                return res.status(403).json({ message: 'Access denied' });
            }
            if (user.role !== UserRole.CUSTOMER || role !== UserRole.CUSTOMER) {
                return res.status(403).json({ message: 'Can only modify customer accounts' });
            }
        }

        // Prevent modifying Super Admin
        if (user.role === UserRole.SUPER_ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Cannot modify Super Admin' });
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already exists' });
            }
        }

        user.name = name || user.name;
        user.email = email || user.email;
        if (password) {
            const salt = await bcryptjs.genSalt(10);
            user.password = await bcryptjs.hash(password, salt);
        }
        user.role = role || user.role;
        user.businessId = businessId || user.businessId;
        user.isActive = isActive !== undefined ? isActive : user.isActive;

        await user.save();
        const { password: _, ...userResponse } = user.toObject();
        res.json(userResponse);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Business Admin restrictions
        if (req.user.role === UserRole.BUSINESS_ADMIN) {
            if (user.businessId !== req.user.businessId) {
                return res.status(403).json({ message: 'Access denied' });
            }
            if (user.role !== UserRole.CUSTOMER) {
                return res.status(403).json({ message: 'Can only delete customer accounts' });
            }
        }

        // Prevent deleting Super Admin
        if (user.role === UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Cannot delete Super Admin' });
        }

        await user.deleteOne();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
}; 