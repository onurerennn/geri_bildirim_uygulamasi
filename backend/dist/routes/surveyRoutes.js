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
// Public routes
router.get('/active', surveyController_1.getActiveSurveys);
router.get('/code/:code', surveyController_1.getSurveyByCode);
router.post('/response', surveyController_1.submitResponse);
// Protected business routes
router.get('/business/:businessId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getBusinessSurveys);
router.get('/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getSurvey);
router.post('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.createSurvey);
router.put('/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.updateSurvey);
router.delete('/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.deleteSurvey);
router.get('/:surveyId/responses', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getSurveyResponses);
// QR Code routes
router.post('/qr/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.generateQRCode);
router.get('/qr/business/:businessId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getBusinessQRCodes);
router.get('/qr/survey/:surveyId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.getSurveyQRCodes);
router.delete('/qr/cleanup', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.SUPER_ADMIN), surveyController_1.cleanupQRCodes);
exports.default = router;
