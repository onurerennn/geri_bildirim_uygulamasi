"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const customAuth_1 = require("../middleware/customAuth");
const surveyController_1 = require("../controllers/surveyController");
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
console.log('💡 Business survey routes başlatılıyor...');
// İşletmeye ait anketleri getirme endpoint'i
// Parametresiz çağrı için özel middleware ekliyoruz
router.get('/surveys', authMiddleware_1.protect, (req, res, next) => {
    console.log('Business surveys middleware çalıştı');
    // Bu middleware, URL'de businessId parametresi olmadığında
    // req.params.businessId'yi req.user.business'ten dolduruyor
    if (!req.params.businessId && req.user && req.user.business) {
        req.params.businessId = req.user.business;
        console.log('Business ID eklendi:', req.params.businessId);
    }
    // Yine de business ID yoksa ve body'de varsa oradan al
    if (!req.params.businessId && req.body && req.body.business) {
        req.params.businessId = req.body.business;
        console.log('Business ID body\'den alındı:', req.params.businessId);
    }
    // Son çare: id'den türet
    if (!req.params.businessId && req.user && req.user.id) {
        // Eğer ID ObjectId formatındaysa direkt kullan
        if (mongoose_1.default.Types.ObjectId.isValid(req.user.id)) {
            req.params.businessId = req.user.id;
        }
        else {
            // Değilse yeni bir ObjectId oluştur
            req.params.businessId = new mongoose_1.default.Types.ObjectId().toString();
        }
        console.log('Business ID kullanıcı ID\'sinden alındı:', req.params.businessId);
    }
    next();
}, customAuth_1.flexibleRoleCheck, surveyController_1.getBusinessSurveys);
// İşletme anketleri için alternatif route - daha esnek kontrol
router.get('/surveys/all', authMiddleware_1.protect, customAuth_1.flexibleRoleCheck, surveyController_1.getBusinessSurveys);
// İşletmeye ait anket oluşturma endpoint'i - esnek yetki kontrolü ile
router.post('/create-survey', authMiddleware_1.protect, customAuth_1.flexibleRoleCheck, surveyController_1.createSurvey);
// Debug için anket oluşturma - develop aşamasında kullanılabilir
router.post('/surveys/debug', authMiddleware_1.protect, customAuth_1.debugRoleCheck, surveyController_1.createSurvey);
// BusinessID parametresi olan route
router.get('/:businessId/surveys', authMiddleware_1.protect, customAuth_1.flexibleRoleCheck, surveyController_1.getBusinessSurveys);
// POST yöntemiyle alternatif anket oluşturma - eski istemciler için destek
router.post('/surveys', authMiddleware_1.protect, customAuth_1.flexibleRoleCheck, surveyController_1.createSurvey);
console.log('✅ Business survey routes başarıyla yüklendi');
exports.default = router;
