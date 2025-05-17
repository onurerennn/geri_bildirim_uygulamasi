import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    checkBusinessAdminOrSuperAdmin,
    debugRoleCheck,
    flexibleRoleCheck
} from '../middleware/customAuth';
import { UserRole } from '../types/UserRole';
import {
    getBusinessSurveys,
    createSurvey
} from '../controllers/surveyController';
import mongoose from 'mongoose';

const router = express.Router();

console.log('💡 Business survey routes başlatılıyor...');

// İşletmeye ait anketleri getirme endpoint'i
// Parametresiz çağrı için özel middleware ekliyoruz
router.get('/surveys', protect, (req, res, next) => {
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
        if (mongoose.Types.ObjectId.isValid(req.user.id)) {
            req.params.businessId = req.user.id;
        } else {
            // Değilse yeni bir ObjectId oluştur
            req.params.businessId = new mongoose.Types.ObjectId().toString();
        }
        console.log('Business ID kullanıcı ID\'sinden alındı:', req.params.businessId);
    }

    next();
}, flexibleRoleCheck, getBusinessSurveys);

// İşletme anketleri için alternatif route - daha esnek kontrol
router.get('/surveys/all', protect, flexibleRoleCheck, getBusinessSurveys);

// İşletmeye ait anket oluşturma endpoint'i - esnek yetki kontrolü ile
router.post('/create-survey', protect, flexibleRoleCheck, createSurvey);

// Debug için anket oluşturma - develop aşamasında kullanılabilir
router.post('/surveys/debug', protect, debugRoleCheck, createSurvey);

// BusinessID parametresi olan route
router.get('/:businessId/surveys', protect, flexibleRoleCheck, getBusinessSurveys);

// POST yöntemiyle alternatif anket oluşturma - eski istemciler için destek
router.post('/surveys', protect, flexibleRoleCheck, createSurvey);

console.log('✅ Business survey routes başarıyla yüklendi');

export default router;