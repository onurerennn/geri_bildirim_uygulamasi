import express from 'express';
import {
    getActiveSurveys,
    getSurvey,
    getSurveyByCode,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    getBusinessSurveys,
    submitSurveyResponse,
    getBusinessQRCodes,
    getBusinessResponses,
    approveResponsePoints,
    rejectResponsePoints,
    getPendingApprovals,
    deleteResponse
} from '../controllers/surveyController';
import { protect, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../types/UserRole';

const router = express.Router();

// Public routes
router.get('/active', getActiveSurveys);
router.get('/code/:code', getSurveyByCode);

// QR kod erişim endpoint - müşteriler için
router.get('/qr/:qrCodeId', async (req, res) => {
    try {
        const { qrCodeId } = req.params;
        const { QRCode } = require('../models');

        if (!qrCodeId) {
            return res.status(400).json({
                success: false,
                message: 'QR kod ID\'si gereklidir'
            });
        }

        // QR kodu veritabanından getir
        const qrCode = await QRCode.findById(qrCodeId);

        if (!qrCode) {
            return res.status(404).json({
                success: false,
                message: 'QR kod bulunamadı'
            });
        }

        // Format parametresi kontrolü - eğer format=array ise bir dizi içinde döndür
        const format = req.query.format;
        if (format === 'array') {
            return res.status(200).json({
                success: true,
                data: [
                    {
                        _id: qrCode._id.toString(),
                        code: qrCode.code,
                        url: qrCode.url,
                        surveyId: qrCode.surveyId || qrCode.survey,
                        businessId: qrCode.businessId || qrCode.business,
                        isActive: qrCode.isActive,
                        description: qrCode.description,
                        location: qrCode.location,
                        createdAt: qrCode.createdAt
                    }
                ]
            });
        }

        // Tek QR kod objesi olarak döndür (varsayılan)
        return res.status(200).json({
            success: true,
            data: {
                _id: qrCode._id.toString(),
                code: qrCode.code,
                url: qrCode.url,
                surveyId: qrCode.surveyId || qrCode.survey,
                businessId: qrCode.businessId || qrCode.business,
                isActive: qrCode.isActive,
                description: qrCode.description || null,
                location: qrCode.location || null
            }
        });
    } catch (error) {
        console.error('QR kod getirme hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'QR kod getirme sırasında bir hata oluştu'
        });
    }
});

// Ankete ait QR kodlarını getirme endpoint'i
router.get('/qr/survey/:surveyId', async (req, res) => {
    try {
        const { surveyId } = req.params;
        const { QRCode } = require('../models');
        const mongoose = require('mongoose');

        if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir anket ID\'si gereklidir',
                data: []
            });
        }

        // QR kodları veritabanından getir - hem surveyId hem de survey alanlarını kontrol et
        const qrCodes = await QRCode.find({
            $or: [
                { surveyId: surveyId },
                { survey: surveyId }
            ]
        });

        console.log(`Anket için ${qrCodes.length} QR kod bulundu: ${surveyId}`);

        if (!qrCodes || qrCodes.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Bu anket için QR kod bulunamadı',
                data: []
            });
        }

        // QR kodları dizi içinde döndür
        return res.status(200).json({
            success: true,
            data: qrCodes.map((qrCode: any) => ({
                _id: qrCode._id.toString(),
                code: qrCode.code,
                url: qrCode.url,
                surveyId: qrCode.surveyId || qrCode.survey,
                businessId: qrCode.businessId || qrCode.business,
                isActive: qrCode.isActive,
                description: qrCode.description || null,
                location: qrCode.location || null,
                createdAt: qrCode.createdAt
            }))
        });
    } catch (error) {
        console.error('Anket QR kodları getirme hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'QR kodları getirme sırasında bir hata oluştu',
            data: []
        });
    }
});

// Anket yanıtları için endpointler - her iki formatı da destekle
router.post('/response/:surveyId', submitSurveyResponse);
router.post('/:surveyId/responses', submitSurveyResponse);

// Puan onaylama endpoint'i
router.patch('/responses/:responseId/approve-points', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), approveResponsePoints);

// Puan reddetme endpoint'i
router.patch('/responses/:responseId/reject-points', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), rejectResponsePoints);

// Yanıt silme endpoint'i
router.delete('/responses/:responseId', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), deleteResponse);

// Onaylanmamış puanları getir
router.get('/business/pending-approvals', protect, authorize(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN), getPendingApprovals);

// Protected routes - require authentication
router.use(protect);

// QR kod rotaları
router.get('/qr/business/:businessId', authorize(UserRole.BUSINESS_ADMIN), getBusinessQRCodes);

// Business responses route
router.get('/business/:businessId/responses', authorize(UserRole.BUSINESS_ADMIN), getBusinessResponses);

// Business Admin routes
router.route('/business')
    .post(authorize(UserRole.BUSINESS_ADMIN), createSurvey)
    .get(authorize(UserRole.BUSINESS_ADMIN), async (req, res) => {
        // Redirect to the business-specific route
        const businessId = req.user?.business;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID not found' });
        }
        return getBusinessSurveys(req, res);
    });

// Business-specific routes
router.route('/business/:businessId')
    .get(authorize(UserRole.BUSINESS_ADMIN), getBusinessSurveys);

// Ana rota - CRUD operasyonları
// Root endpoint için POST handler ekliyoruz
router.post('/', authorize(UserRole.BUSINESS_ADMIN), createSurvey);

// Survey management routes
router.route('/:id')
    .get(getSurvey)
    .put(authorize(UserRole.BUSINESS_ADMIN), updateSurvey)
    .delete(authorize(UserRole.BUSINESS_ADMIN), deleteSurvey);

export default router; 