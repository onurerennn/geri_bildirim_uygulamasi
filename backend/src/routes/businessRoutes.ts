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

// E-posta ile işletme sorgulaması (giriş kolaylığı için public)
router.get('/by-email', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email parametresi gereklidir' });
        }

        const Business = require('../models/Business').default;
        const business = await Business.findOne({ email }).select('-password');

        if (!business) {
            return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });
        }

        res.json(business);
    } catch (error: any) {
        console.error('Email ile işletme sorgulama hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İşletme sorgulanırken bir hata oluştu',
            error: error.message
        });
    }
});

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