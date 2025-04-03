import { Request, Response } from 'express';
import { Business } from '../models/Business';
import { UserRole } from '../types/enums';

// Get all businesses
export const getBusinesses = async (req: Request, res: Response) => {
    try {
        const businesses = await Business.find()
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(businesses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching businesses' });
    }
};

// Get single business
export const getBusiness = async (req: Request, res: Response) => {
    try {
        const business = await Business.findById(req.params.id)
            .populate('approvedBy', 'name email');

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        res.json(business);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching business' });
    }
};

// Create business
export const createBusiness = async (req: Request, res: Response) => {
    try {
        const { name, address, phone, email, description, logo } = req.body;

        // Check if business with same email exists
        const existingBusiness = await Business.findOne({ email });
        if (existingBusiness) {
            return res.status(400).json({ message: 'Business with this email already exists' });
        }

        const business = new Business({
            name,
            address,
            phone,
            email,
            description,
            logo,
        });

        await business.save();
        res.status(201).json(business);
    } catch (error) {
        res.status(500).json({ message: 'Error creating business' });
    }
};

// Update business
export const updateBusiness = async (req: Request, res: Response) => {
    try {
        const { name, address, phone, email, description, logo, isActive } = req.body;
        const business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        if (email && email !== business.email) {
            const existingBusiness = await Business.findOne({ email });
            if (existingBusiness) {
                return res.status(400).json({ message: 'Business with this email already exists' });
            }
        }

        business.name = name || business.name;
        business.address = address || business.address;
        business.phone = phone || business.phone;
        business.email = email || business.email;
        business.description = description || business.description;
        business.logo = logo || business.logo;
        business.isActive = isActive !== undefined ? isActive : business.isActive;

        await business.save();
        res.json(business);
    } catch (error) {
        res.status(500).json({ message: 'Error updating business' });
    }
};

// Delete business
export const deleteBusiness = async (req: Request, res: Response) => {
    try {
        const business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        await business.deleteOne();
        res.json({ message: 'Business deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting business' });
    }
};

// Approve business
export const approveBusiness = async (req: Request, res: Response) => {
    try {
        const business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Only Super Admin can approve businesses
        if (req.user.role !== UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Only Super Admin can approve businesses' });
        }

        business.isApproved = true;
        business.approvedBy = req.user._id;
        business.approvedAt = new Date();

        await business.save();
        res.json(business);
    } catch (error) {
        res.status(500).json({ message: 'Error approving business' });
    }
}; 