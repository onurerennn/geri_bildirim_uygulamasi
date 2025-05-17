"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const surveyController_1 = require("../controllers/surveyController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const UserRole_1 = require("../types/UserRole");
const router = express_1.default.Router();
// Public routes
router.get('/active', surveyController_1.getActiveSurveys);
router.get('/code/:code', surveyController_1.getSurveyByCode);
// QR kod erişim endpoint - müşteriler için
router.get('/qr/:qrCodeId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const qrCode = yield QRCode.findById(qrCodeId);
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
    }
    catch (error) {
        console.error('QR kod getirme hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'QR kod getirme sırasında bir hata oluştu'
        });
    }
}));
// Ankete ait QR kodlarını getirme endpoint'i
router.get('/qr/survey/:surveyId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const qrCodes = yield QRCode.find({
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
            data: qrCodes.map((qrCode) => ({
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
    }
    catch (error) {
        console.error('Anket QR kodları getirme hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'QR kodları getirme sırasında bir hata oluştu',
            data: []
        });
    }
}));
// Anket yanıtları için endpointler - her iki formatı da destekle
router.post('/response/:surveyId', surveyController_1.submitSurveyResponse);
router.post('/:surveyId/responses', surveyController_1.submitSurveyResponse);
// Puan onaylama endpoint'i
router.patch('/responses/:responseId/approve-points', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.approveResponsePoints);
// Puan reddetme endpoint'i
router.patch('/responses/:responseId/reject-points', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.rejectResponsePoints);
// Yanıt silme endpoint'i
router.delete('/responses/:responseId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.deleteResponse);
// Onaylanmamış puanları getir
router.get('/business/pending-approvals', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getPendingApprovals);
// Protected routes - require authentication
router.use(authMiddleware_1.protect);
// QR kod rotaları
router.get('/qr/business/:businessId', (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN), surveyController_1.getBusinessQRCodes);
// Business responses route
router.get('/business/:businessId/responses', (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN), surveyController_1.getBusinessResponses);
// Business Admin routes
router.route('/business')
    .post((0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN), surveyController_1.createSurvey)
    .get((0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Redirect to the business-specific route
    const businessId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.business;
    if (!businessId) {
        return res.status(400).json({ error: 'Business ID not found' });
    }
    return (0, surveyController_1.getBusinessSurveys)(req, res);
}));
// Business-specific routes
router.route('/business/:businessId')
    .get((0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN), surveyController_1.getBusinessSurveys);
// Ana rota - CRUD operasyonları
// Root endpoint için POST handler ekliyoruz
router.post('/', (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN), surveyController_1.createSurvey);
// Survey management routes
router.route('/:id')
    .get(surveyController_1.getSurvey)
    .put((0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN), surveyController_1.updateSurvey)
    .delete((0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN), surveyController_1.deleteSurvey);
exports.default = router;
