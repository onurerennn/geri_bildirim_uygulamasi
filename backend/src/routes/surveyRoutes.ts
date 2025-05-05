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
    deleteQRCode,
    getQRCodeImage,
    updateQRCode,
    incrementQRCodeScanCount
} from '../controllers/surveyController';
import { protect, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../types/UserRole';
import mongoose from 'mongoose';
import Survey from '../models/Survey';

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
router.get('/qr/image/:qrCodeId', getQRCodeImage);
router.post('/qr/scan', incrementQRCodeScanCount);
router.put('/qr/:qrCodeId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), updateQRCode);
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

// DELETE - Alternatif URL formatları için ek rotalar
console.log('✓ Alternatif silme rotaları tanımlanıyor...');
router.delete('/delete/:surveyId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), deleteSurvey);
router.delete('/remove/:surveyId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), deleteSurvey);
router.delete('/id/:surveyId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), deleteSurvey);

// POST ile silme (DELETE metodunun desteklenmediği durumlar için)
router.post('/:surveyId/delete', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), deleteSurvey);
router.post('/delete/:surveyId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), deleteSurvey);

// Veritabanı işlemleri için özel rota
router.post('/db-operations', protect, authorize(UserRole.SUPER_ADMIN), async (req, res) => {
    try {
        const { operation, surveyId } = req.body;

        console.log(`🛠️ Veritabanı işlemi isteği: ${operation}, Anket: ${surveyId}`);

        if (!operation) {
            return res.status(400).json({ error: 'İşlem türü belirtilmedi' });
        }

        if (operation === 'deleteSurvey' && surveyId) {
            if (!mongoose.Types.ObjectId.isValid(surveyId)) {
                return res.status(400).json({ error: 'Geçersiz anket ID' });
            }

            // İlişkili QR kodlarını sil
            const qrDeleteResult = await mongoose.model('QRCode').deleteMany({ survey: surveyId });

            // Anketi sil
            const deleteResult = await Survey.deleteOne({ _id: surveyId });

            if (deleteResult.deletedCount === 0) {
                return res.status(404).json({ error: 'Anket bulunamadı veya silinemedi' });
            }

            return res.status(200).json({
                message: 'Anket başarıyla silindi (veritabanı işlemi)',
                qrCodesDeleted: qrDeleteResult.deletedCount,
                surveysDeleted: deleteResult.deletedCount
            });
        }

        // Diğer veritabanı işlemleri buraya eklenebilir

        return res.status(400).json({ error: 'Desteklenmeyen işlem' });
    } catch (error: any) {
        console.error('Veritabanı işlemi hatası:', error);
        return res.status(500).json({ error: error.message });
    }
});

// SUPER ADMIN - ÖZEL YÖNETİM ENDPOINTİ
router.post('/admin-operations', protect, authorize(UserRole.SUPER_ADMIN), async (req, res) => {
    try {
        const { operation, surveyId, data } = req.body;

        console.log(`🔧 Yönetici işlemi: ${operation}`);
        console.log('İşlem detayları:', req.body);

        // İlgili anketi bul (gerekirse)
        let survey = null;
        if (surveyId && mongoose.Types.ObjectId.isValid(surveyId)) {
            survey = await Survey.findById(surveyId);
        }

        switch (operation) {
            case 'forceSurveyDelete':
                if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) {
                    return res.status(400).json({ error: 'Geçersiz anket ID' });
                }

                // QR kodlarını sil
                await mongoose.model('QRCode').deleteMany({ survey: surveyId });

                // Yanıtları sil (varsa)
                if (mongoose.models.Response) {
                    await mongoose.model('Response').deleteMany({ survey: surveyId });
                }

                // Anketi sil
                const deleteResult = await Survey.findByIdAndDelete(surveyId);

                return res.status(200).json({
                    message: 'Anket ve ilgili tüm veriler zorla silindi',
                    success: true,
                    survey: deleteResult
                });

            case 'disableSurvey':
                if (!survey) {
                    return res.status(404).json({ error: 'Anket bulunamadı' });
                }

                // Sadece aktiflik durumunu güncelle - silme değil
                survey.isActive = false;
                await survey.save();

                return res.status(200).json({
                    message: 'Anket pasif duruma alındı',
                    success: true,
                    survey
                });

            case 'findSurvey':
                // MongoDB sorgusu ile anket(ler) bul
                const query = data?.query || {};
                const foundSurveys = await Survey.find(query).limit(10);

                return res.status(200).json({
                    count: foundSurveys.length,
                    surveys: foundSurveys
                });

            default:
                return res.status(400).json({ error: 'Desteklenmeyen işlem' });
        }
    } catch (error: any) {
        console.error('Admin işlemi hatası:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Yükleme tamamlandı
console.log('✅ Survey rotaları başarıyla yüklendi!');

export default router; 