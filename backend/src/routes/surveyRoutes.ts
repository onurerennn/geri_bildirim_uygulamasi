import express from 'express';
import {
    getActiveSurveys,
    getSurvey,
    getSurveyByCode,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    submitSurveyResponse,
    getBusinessSurveys,
    generateQRCode,
    cleanupInvalidQRCodes,
    getBusinessQRCodes,
    getSurveyQRCodes,
    deleteQRCode
} from '../controllers/surveyController';
import { protect, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../types/UserRole';

const router = express.Router();

// Rotaları logla
console.log('🔍 Survey rotaları yükleniyor...');

// ---------------------- 1. GENEL/UMUMI ROTALAR ----------------------
// Bu rotalar herkese açık
console.log('✓ Genel rotalar tanımlanıyor...');
router.get('/active', getActiveSurveys);
router.get('/code/:code', getSurveyByCode);
router.post('/response', submitSurveyResponse);

// ---------------------- 2. QR KODLARI İÇİN ÖZEL ROTALAR ----------------------
// Öncelik:
// 1. En uzun ve spesifik path'ler önce
// 2. Path çakışmalarını önle
console.log('✓ QR kod rotaları tanımlanıyor...');
router.get('/qr/business/:businessId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), getBusinessQRCodes);
router.get('/qr/survey/:surveyId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), getSurveyQRCodes);
router.delete('/qr/cleanup', protect, authorize(UserRole.SUPER_ADMIN), cleanupInvalidQRCodes);
router.delete('/qr/:qrCodeId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), deleteQRCode);
router.post('/qr/:surveyId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), generateQRCode);

// ---------------------- 3. İŞLETME İLE İLGİLİ ROTALAR ----------------------
console.log('✓ İşletme rotaları tanımlanıyor...');
router.get('/business/:businessId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), getBusinessSurveys);

// ---------------------- 4. TEMEL ANKET CRUD İŞLEMLERİ ----------------------
console.log('✓ Ana CRUD rotaları tanımlanıyor...');

// POST - Anket Oluşturma - Özel loglama ekle
router.post('/',
    (req, res, next) => {
        console.log('📣 POST /api/surveys endpointi çağrıldı');
        console.log('📦 İstek gövdesi:', {
            ...req.body,
            questions: req.body.questions ? `${req.body.questions.length} adet soru` : 'Sorular bulunamadı'
        });
        console.log('👤 Kullanıcı:', req.user ? {
            id: req.user.id,
            role: req.user.role,
            business: req.user.business
        } : 'Kullanıcı bilgisi yok');
        next();
    },
    protect,
    authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN),
    createSurvey
);

// GET - Anket Detayı
router.get('/:surveyId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), getSurvey);

// PUT - Anket Güncelleme
router.put('/:surveyId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), updateSurvey);

// DELETE - Anket Silme
router.delete('/:surveyId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), deleteSurvey);

// Yükleme tamamlandı
console.log('✅ Survey rotaları başarıyla yüklendi!');

export default router; 