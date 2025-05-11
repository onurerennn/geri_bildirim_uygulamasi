"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const customAuth_1 = require("../middleware/customAuth");
const surveyController_1 = require("../controllers/surveyController");
const router = express_1.default.Router();
console.log('💡 Business survey routes başlatılıyor...');
// İşletmeye ait anketleri getirme endpoint'i
router.get('/surveys', authMiddleware_1.protect, customAuth_1.checkBusinessAdminOrSuperAdmin, surveyController_1.getBusinessSurveys);
// İşletme anketleri için alternatif route - daha esnek kontrol
router.get('/surveys/all', authMiddleware_1.protect, customAuth_1.flexibleRoleCheck, surveyController_1.getBusinessSurveys);
// İşletmeye ait anket oluşturma endpoint'i - esnek yetki kontrolü ile
router.post('/surveys', authMiddleware_1.protect, customAuth_1.flexibleRoleCheck, surveyController_1.createSurvey);
// Debug için anket oluşturma - develop aşamasında kullanılabilir
router.post('/surveys/debug', authMiddleware_1.protect, customAuth_1.debugRoleCheck, surveyController_1.createSurvey);
// Eski yolu korumak için aynı controller'ı burada da kullan
router.get('/:businessId/surveys', authMiddleware_1.protect, customAuth_1.checkBusinessAdminOrSuperAdmin, surveyController_1.getBusinessSurveys);
// POST yöntemiyle alternatif anket oluşturma - eski istemciler için destek
router.post('/create-survey', authMiddleware_1.protect, customAuth_1.flexibleRoleCheck, surveyController_1.createSurvey);
console.log('✅ Business survey routes başarıyla yüklendi');
exports.default = router;
