import express from 'express';
import {
    getQRCodesBySurvey,
    getQRCodesByBusiness,
    createQRCode,
    updateQRCode,
    deleteQRCode
} from '../controllers/qrCodeController';
import { protect, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../types/UserRole';

const router = express.Router();

// Tüm route'lar için kimlik doğrulama gerekli
router.use(protect);

// Anket ID'sine göre QR kodları getirme
router.get('/survey/:surveyId', authorize([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), getQRCodesBySurvey);

// İşletme ID'sine göre QR kodları getirme
router.get('/business/:businessId', authorize([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), getQRCodesByBusiness);

// Yeni QR kod oluşturma
router.post('/', authorize([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), createQRCode);

// QR kodu güncelleme ve silme
router.route('/:id')
    .put(authorize([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), updateQRCode)
    .delete(authorize([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), deleteQRCode);

export default router; 