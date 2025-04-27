import express from 'express';
import {
    getFeedbacks,
    getFeedback,
    createFeedback,
    updateFeedback,
    deleteFeedback
} from '../controllers/feedbackController';
import { protect } from '../middleware/auth';
import { checkRole } from '../middleware/roleAuth';
import { UserRole } from '../types/UserRole';

const router = express.Router();

// Tüm rotalar için authentication gerekli
router.use(protect);

// Geri bildirimleri listeleme (Tüm admin rollerine açık)
router.get('/', checkRole([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), getFeedbacks);

// Tekil geri bildirim görüntüleme (Tüm admin rollerine açık)
router.get('/:id', checkRole([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), getFeedback);

// Geri bildirim oluşturma (Normal kullanıcılar dahil tüm roller)
router.post('/', createFeedback);

// Geri bildirim güncelleme (Business Admin veya Super Admin)
router.put('/:id', checkRole([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), updateFeedback);

// Geri bildirim silme (Business Admin veya Super Admin)
router.delete('/:id', checkRole([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]), deleteFeedback);

export default router; 