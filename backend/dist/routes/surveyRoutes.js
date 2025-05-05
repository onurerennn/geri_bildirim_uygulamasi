"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const surveyController_1 = require("../controllers/surveyController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const UserRole_1 = require("../types/UserRole");
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
router.delete('/qr/cleanup', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.cleanupInvalidQRCodes);
router.delete('/qr/:qrCodeId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.deleteQRCode);
router.post('/qr/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.generateQRCode);
// ---------------------- 3. İŞLETME İLE İLGİLİ ROTALAR ----------------------
console.log('✓ İşletme rotaları tanımlanıyor...');
router.get('/business/:businessId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getBusinessSurveys);
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
}, authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.createSurvey);
// GET - Anket Detayı
router.get('/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getSurvey);
// PUT - Anket Güncelleme
router.put('/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.updateSurvey);
// DELETE - Anket Silme
router.delete('/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.deleteSurvey);
// Yükleme tamamlandı
console.log('✅ Survey rotaları başarıyla yüklendi!');
exports.default = router;
