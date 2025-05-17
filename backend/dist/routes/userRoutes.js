"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const roleAuth_1 = require("../middleware/roleAuth");
const UserRole_1 = require("../types/UserRole");
const router = express_1.default.Router();
// Tüm rotalar için authentication gerekli
router.use(auth_1.protect);
// Profil rotaları - tüm kullanıcılar için erişilebilir
router.get('/profile', userController_1.getUserProfile);
// Müşteri ve puan yönetimi - işletme yöneticileri ve süper admin için
router.get('/business/:businessId/customers', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN]), userController_1.getBusinessCustomers);
router.patch('/:userId/reward-points', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.BUSINESS_ADMIN, UserRole_1.UserRole.SUPER_ADMIN]), userController_1.updateRewardPoints);
// Admin ve Super Admin rotaları
router.get('/', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.SUPER_ADMIN]), userController_1.getUsers);
router.get('/:id', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), userController_1.getUser);
router.post('/', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.SUPER_ADMIN]), userController_1.createUser);
router.put('/:id', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.SUPER_ADMIN]), userController_1.updateUser);
router.delete('/:id', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.SUPER_ADMIN]), userController_1.deleteUser);
exports.default = router;
