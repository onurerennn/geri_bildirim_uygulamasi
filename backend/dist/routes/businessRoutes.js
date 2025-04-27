"use strict";
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
