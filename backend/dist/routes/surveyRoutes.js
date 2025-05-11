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
const customAuth_1 = require("../middleware/customAuth");
const UserRole_1 = require("../types/UserRole");
const mongoose_1 = __importDefault(require("mongoose"));
const Survey_1 = __importDefault(require("../models/Survey"));
const router = express_1.default.Router();
// Rotaları logla
console.log('🔍 Survey rotaları yükleniyor...');
// ---------------------- 1. GENEL/UMUMI ROTALAR ----------------------
// Bu rotalar herkese açık
console.log('✓ Genel rotalar tanımlanıyor...');
router.get('/active', surveyController_1.getActiveSurveys);
router.get('/code/:code', surveyController_1.getSurveyByCode);
router.post('/response', surveyController_1.submitSurveyResponse);
// ---------------------- 2. QR KODLARI İÇİN ÖZEL ROTALAR ----------------------
// Öncelik:
// 1. En uzun ve spesifik path'ler önce
// 2. Path çakışmalarını önle
console.log('✓ QR kod rotaları tanımlanıyor...');
router.get('/qr/business/:businessId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getBusinessQRCodes);
router.get('/qr/survey/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getSurveyQRCodes);
router.get('/qr/image/:qrCodeId', surveyController_1.getQRCodeImage);
router.post('/qr/scan', surveyController_1.incrementQRCodeScanCount);
router.put('/qr/:qrCodeId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.updateQRCode);
router.delete('/qr/cleanup', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.cleanupInvalidQRCodes);
router.delete('/qr/:qrCodeId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.deleteQRCode);
router.post('/qr/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.generateQRCode);
// ---------------------- 3. İŞLETME İLE İLGİLİ ROTALAR ----------------------
console.log('✓ İşletme rotaları tanımlanıyor...');
router.get('/business/:businessId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getBusinessSurveys);
// Alternatif endpoint - business/surveys endpoint'ine erişim için
router.get('/all', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getBusinessSurveys);
// ---------------------- 4. TEMEL ANKET CRUD İŞLEMLERİ ----------------------
console.log('✓ Ana CRUD rotaları tanımlanıyor...');
// POST - Anket Oluşturma - Özel loglama ekle
router.post('/', (req, res, next) => {
    console.log('📣 POST /api/surveys endpointi çağrıldı');
    console.log('📦 İstek gövdesi:', Object.assign(Object.assign({}, req.body), { questions: req.body.questions ? `${req.body.questions.length} adet soru` : 'Sorular bulunamadı' }));
    console.log('👤 Kullanıcı:', req.user ? {
        id: req.user.id,
        role: req.user.role,
        business: req.user.business
    } : 'Kullanıcı bilgisi yok');
    next();
}, authMiddleware_1.protect, customAuth_1.flexibleRoleCheck, surveyController_1.createSurvey);
// Alternatif anket oluşturma endpoint'i - debug mode etkin
router.post('/create', (req, res, next) => {
    console.log('📣 POST /api/surveys/create endpointi çağrıldı - Debug modu');
    next();
}, authMiddleware_1.protect, customAuth_1.debugRoleCheck, surveyController_1.createSurvey);
// GET - Anket Detayı
router.get('/:surveyId', authMiddleware_1.protect, customAuth_1.checkBusinessAdminOrSuperAdmin, surveyController_1.getSurvey);
// PUT - Anket Güncelleme
router.put('/:surveyId', authMiddleware_1.protect, customAuth_1.checkBusinessAdminOrSuperAdmin, surveyController_1.updateSurvey);
// DELETE - Anket Silme
router.delete('/:surveyId', authMiddleware_1.protect, customAuth_1.checkBusinessAdminOrSuperAdmin, surveyController_1.deleteSurvey);
// DELETE - Alternatif URL formatları için ek rotalar
console.log('✓ Alternatif silme rotaları tanımlanıyor...');
router.delete('/delete/:surveyId', authMiddleware_1.protect, customAuth_1.checkBusinessAdminOrSuperAdmin, surveyController_1.deleteSurvey);
router.delete('/remove/:surveyId', authMiddleware_1.protect, customAuth_1.checkBusinessAdminOrSuperAdmin, surveyController_1.deleteSurvey);
router.delete('/id/:surveyId', authMiddleware_1.protect, customAuth_1.checkBusinessAdminOrSuperAdmin, surveyController_1.deleteSurvey);
// POST ile silme (DELETE metodunun desteklenmediği durumlar için)
router.post('/:surveyId/delete', authMiddleware_1.protect, customAuth_1.checkBusinessAdminOrSuperAdmin, surveyController_1.deleteSurvey);
router.post('/delete/:surveyId', authMiddleware_1.protect, customAuth_1.checkBusinessAdminOrSuperAdmin, surveyController_1.deleteSurvey);
// Veritabanı işlemleri için özel rota
router.post('/db-operations', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.SUPER_ADMIN), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { operation, surveyId } = req.body;
        console.log(`🛠️ Veritabanı işlemi isteği: ${operation}, Anket: ${surveyId}`);
        if (!operation) {
            return res.status(400).json({ error: 'İşlem türü belirtilmedi' });
        }
        if (operation === 'deleteSurvey' && surveyId) {
            if (!mongoose_1.default.Types.ObjectId.isValid(surveyId)) {
                return res.status(400).json({ error: 'Geçersiz anket ID' });
            }
            // İlişkili QR kodlarını sil
            const qrDeleteResult = yield mongoose_1.default.model('QRCode').deleteMany({ survey: surveyId });
            // Anketi sil
            const deleteResult = yield Survey_1.default.deleteOne({ _id: surveyId });
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
    }
    catch (error) {
        console.error('Veritabanı işlemi hatası:', error);
        return res.status(500).json({ error: error.message });
    }
}));
// SUPER ADMIN - ÖZEL YÖNETİM ENDPOINTİ
router.post('/admin-operations', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.SUPER_ADMIN), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { operation, surveyId, data } = req.body;
        console.log(`🔧 Yönetici işlemi: ${operation}`);
        console.log('İşlem detayları:', req.body);
        // İlgili anketi bul (gerekirse)
        let survey = null;
        if (surveyId && mongoose_1.default.Types.ObjectId.isValid(surveyId)) {
            survey = yield Survey_1.default.findById(surveyId);
        }
        switch (operation) {
            case 'forceSurveyDelete':
                if (!surveyId || !mongoose_1.default.Types.ObjectId.isValid(surveyId)) {
                    return res.status(400).json({ error: 'Geçersiz anket ID' });
                }
                // QR kodlarını sil
                yield mongoose_1.default.model('QRCode').deleteMany({ survey: surveyId });
                // Yanıtları sil (varsa)
                if (mongoose_1.default.models.Response) {
                    yield mongoose_1.default.model('Response').deleteMany({ survey: surveyId });
                }
                // Anketi sil
                const deleteResult = yield Survey_1.default.findByIdAndDelete(surveyId);
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
                yield survey.save();
                return res.status(200).json({
                    message: 'Anket pasif duruma alındı',
                    success: true,
                    survey
                });
            case 'findSurvey':
                // MongoDB sorgusu ile anket(ler) bul
                const query = (data === null || data === void 0 ? void 0 : data.query) || {};
                const foundSurveys = yield Survey_1.default.find(query).limit(10);
                return res.status(200).json({
                    count: foundSurveys.length,
                    surveys: foundSurveys
                });
            default:
                return res.status(400).json({ error: 'Desteklenmeyen işlem' });
        }
    }
    catch (error) {
        console.error('Admin işlemi hatası:', error);
        return res.status(500).json({ error: error.message });
    }
}));
// GET - Alternatif test endpoint
router.get('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Test endpoint çağrıldı - survey/test');
        // Örnek anket verisi
        const testSurvey = {
            _id: 'test_survey_1',
            title: 'Test Anket',
            description: 'Bu bir test anketidir',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            business: {
                _id: 'test_business_1',
                name: 'Test İşletme'
            },
            questions: [
                {
                    _id: 'q1',
                    text: 'Bu hizmetten ne kadar memnun kaldınız?',
                    type: 'rating',
                    required: true
                },
                {
                    _id: 'q2',
                    text: 'Görüşlerinizi bizimle paylaşır mısınız?',
                    type: 'text',
                    required: false
                },
                {
                    _id: 'q3',
                    text: 'Hangi hizmetlerimizi kullandınız?',
                    type: 'multiple_choice',
                    options: ['Yemek', 'İçecek', 'Servis', 'Diğer'],
                    required: true
                }
            ]
        };
        res.status(200).json(testSurvey);
    }
    catch (error) {
        console.error('Test endpoint hatası:', error);
        res.status(500).json({ error: error.message });
    }
}));
// GET - Test işletme anketleri listesi
router.get('/test/business', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Test işletme anketleri endpoint çağrıldı');
        // Örnek anket listesi
        const testSurveys = [
            {
                _id: 'test_survey_1',
                title: 'Müşteri Memnuniyet Anketi',
                description: 'Hizmetlerimiz hakkında görüşleriniz',
                isActive: true,
                createdAt: new Date(),
                business: {
                    _id: 'test_business_1',
                    name: 'Test İşletme'
                }
            },
            {
                _id: 'test_survey_2',
                title: 'Ürün Değerlendirme Anketi',
                description: 'Yeni ürünlerimiz hakkında görüşleriniz',
                isActive: true,
                createdAt: new Date(),
                business: {
                    _id: 'test_business_1',
                    name: 'Test İşletme'
                }
            }
        ];
        res.status(200).json(testSurveys);
    }
    catch (error) {
        console.error('Test işletme anketleri endpoint hatası:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Yükleme tamamlandı
console.log('✅ Survey rotaları başarıyla yüklendi!');
exports.default = router;
