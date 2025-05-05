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
const businessController_1 = require("../controllers/businessController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const UserRole_1 = require("../types/UserRole");
const router = express_1.default.Router();
// Public routes (for development only)
router.post('/create-default', businessController_1.createDefaultBusiness);
// E-posta ile işletme sorgulaması (giriş kolaylığı için public)
router.get('/by-email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email parametresi gereklidir' });
        }
        const Business = require('../models/Business').default;
        const business = yield Business.findOne({ email }).select('-password');
        if (!business) {
            return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });
        }
        res.json(business);
    }
    catch (error) {
        console.error('Email ile işletme sorgulama hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İşletme sorgulanırken bir hata oluştu',
            error: error.message
        });
    }
}));
// Protected routes
router.get('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN]), businessController_1.getBusinesses);
router.post('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN]), businessController_1.createBusiness);
router.post('/:id/approve', authMiddleware_1.protect, (0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN]), businessController_1.approveBusiness);
router.post('/:id/admin', authMiddleware_1.protect, (0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN]), businessController_1.addBusinessAdmin);
router.put('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), businessController_1.updateBusiness);
router.delete('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN]), businessController_1.deleteBusiness);
// BUSINESS_ADMIN ve SUPER_ADMIN rotaları
router.get('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), businessController_1.getBusiness);
exports.default = router;
