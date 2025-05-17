"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const qrCodeController_1 = require("../controllers/qrCodeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const UserRole_1 = require("../types/UserRole");
const router = express_1.default.Router();
// Tüm route'lar için kimlik doğrulama gerekli
router.use(authMiddleware_1.protect);
// Anket ID'sine göre QR kodları getirme
router.get('/survey/:surveyId', (0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), qrCodeController_1.getQRCodesBySurvey);
// İşletme ID'sine göre QR kodları getirme
router.get('/business/:businessId', (0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), qrCodeController_1.getQRCodesByBusiness);
// Yeni QR kod oluşturma
router.post('/', (0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), qrCodeController_1.createQRCode);
// QR kodu güncelleme ve silme
router.route('/:id')
    .put((0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), qrCodeController_1.updateQRCode)
    .delete((0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), qrCodeController_1.deleteQRCode);
exports.default = router;
