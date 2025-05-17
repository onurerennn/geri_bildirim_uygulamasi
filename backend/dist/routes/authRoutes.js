"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const UserRole_1 = require("../types/UserRole");
const router = express_1.default.Router();
// Açık rotalar
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.post('/logout', authController_1.logout);
// Korumalı rotalar
router.get('/me', authMiddleware_1.protect, authController_1.getMe);
router.get('/profile', authMiddleware_1.protect, authController_1.getUserProfile);
// Admin rotaları
router.post('/create-super-admin', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.SUPER_ADMIN), authController_1.createSuperAdmin);
// İşletme admin rotaları
router.get('/business/:businessId/customers', authMiddleware_1.protect, (0, authMiddleware_1.authorize)(UserRole_1.UserRole.BUSINESS_ADMIN), authController_1.getBusinessCustomers);
exports.default = router;
