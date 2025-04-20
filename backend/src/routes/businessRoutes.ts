import express from 'express';
import {
    getBusinesses,
    getBusiness,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    approveBusiness,
} from '../controllers/businessController';
import { authenticate } from '../middleware/authMiddleware';
import { authorize } from '../middleware/roleMiddleware';
import { UserRole } from '../types/UserRole';

const router = express.Router();

// Tüm rotalar için authentication gerekli
router.use(authenticate);

// İşletmeleri listele
router.get('/', authorize([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), getBusinesses);

// İşletme detayı getir
router.get('/:id', authorize([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), getBusiness);

// Yeni işletme oluştur
router.post('/', authorize([UserRole.SUPER_ADMIN]), createBusiness);

// İşletme güncelle
router.put('/:id', authorize([UserRole.SUPER_ADMIN]), updateBusiness);

// İşletme sil
router.delete('/:id', authorize([UserRole.SUPER_ADMIN]), deleteBusiness);

// İşletme onayla
router.post('/:id/approve', authorize([UserRole.SUPER_ADMIN]), approveBusiness);

export default router; 