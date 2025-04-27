"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const feedbackController_1 = require("../controllers/feedbackController");
const auth_1 = require("../middleware/auth");
const roleAuth_1 = require("../middleware/roleAuth");
const UserRole_1 = require("../types/UserRole");
const router = express_1.default.Router();
// Tüm rotalar için authentication gerekli
router.use(auth_1.protect);
// Geri bildirimleri listeleme (Tüm admin rollerine açık)
router.get('/', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), feedbackController_1.getFeedbacks);
// Tekil geri bildirim görüntüleme (Tüm admin rollerine açık)
router.get('/:id', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), feedbackController_1.getFeedback);
// Geri bildirim oluşturma (Normal kullanıcılar dahil tüm roller)
router.post('/', feedbackController_1.createFeedback);
// Geri bildirim güncelleme (Business Admin veya Super Admin)
router.put('/:id', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), feedbackController_1.updateFeedback);
// Geri bildirim silme (Business Admin veya Super Admin)
router.delete('/:id', (0, roleAuth_1.checkRole)([UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN]), feedbackController_1.deleteFeedback);
exports.default = router;
