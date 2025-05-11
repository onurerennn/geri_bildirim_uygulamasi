import express from 'express';
import {
    getActiveSurveys,
    getSurvey,
    getSurveyByCode,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    getBusinessSurveys,
    submitSurveyResponse
} from '../controllers/surveyController';
import { protect, authorize } from '../middleware/authMiddleware';
import { checkBusinessAdminOrSuperAdmin, debugRoleCheck, flexibleRoleCheck } from '../middleware/customAuth';
import { UserRole } from '../types/UserRole';
import mongoose from 'mongoose';
import Survey from '../models/Survey';
import QRCode from '../models/QRCode';
import qrcode from 'qrcode';
import Response from '../models/Response';

const router = express.Router();

// Rotaları logla
console.log('🔍 Survey rotaları yükleniyor...');

// ---------------------- 1. GENEL/UMUMI ROTALAR ----------------------
// Bu rotalar herkese açık
console.log('✓ Genel rotalar tanımlanıyor...');
router.get('/active', getActiveSurveys);
router.get('/code/:code', getSurveyByCode);

// Anket yanıtı göndermek için endpoint (yeni)
router.post('/:surveyId/responses', submitSurveyResponse);

// Alternatif response endpoint (eski)
router.post('/response', submitSurveyResponse);

// ---------------------- 2. QR KODLARI İÇİN ÖZEL ROTALAR ----------------------
// QR API'leri gerçek QR kodları ve veritabanı kullanarak çalışacak
console.log('✅ Gerçek QR kod rotaları etkinleştiriliyor...');

// QR kodlarını almak için gerçek controller fonksiyonu
const getBusinessQRCodes = async (req: express.Request, res: express.Response) => {
    try {
        const { businessId } = req.params;
        console.log(`📊 İşletme QR kodları getiriliyor: ${businessId}`);

        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({ error: 'Geçersiz işletme ID' });
        }

        // QR kodlarını bul
        const qrCodes = await QRCode.find({ businessId })
            .populate('survey', 'title') // anket başlığını al
            .sort({ createdAt: -1 });

        console.log(`✅ ${qrCodes.length} adet QR kodu bulundu`);
        return res.status(200).json(qrCodes);
    } catch (error: any) {
        console.error('❌ QR Kod getirme hatası:', error);
        return res.status(500).json({ error: error.message || 'QR kodları getirilirken bir hata oluştu' });
    }
};

// Anket QR kodlarını almak için gerçek controller fonksiyonu
const getSurveyQRCodes = async (req: express.Request, res: express.Response) => {
    try {
        const { surveyId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(surveyId)) {
            return res.status(400).json({ error: 'Geçersiz anket ID' });
        }

        // Anket QR kodlarını bul
        const qrCodes = await QRCode.find({ survey: surveyId });
        console.log(`✅ Anket (${surveyId}) için ${qrCodes.length} adet QR kodu bulundu`);

        return res.status(200).json(qrCodes);
    } catch (error: any) {
        console.error('❌ Anket QR kodları getirme hatası:', error);
        return res.status(500).json({ error: error.message || 'QR kodları getirilirken bir hata oluştu' });
    }
};

// QR kod görüntüsü almak için gerçek controller fonksiyonu
const getQRCodeImage = async (req: express.Request, res: express.Response) => {
    try {
        const { qrCodeId } = req.params;
        console.log(`🖼️ QR Kod görüntüsü isteniyor: ${qrCodeId}`);

        if (!mongoose.Types.ObjectId.isValid(qrCodeId)) {
            return res.status(400).json({ error: 'Geçersiz QR kod ID' });
        }

        // QR kodu bul
        const qrCode = await QRCode.findById(qrCodeId);

        if (!qrCode) {
            return res.status(404).json({ error: 'QR kod bulunamadı' });
        }

        // QR kodu URL'inden PNG oluştur
        const qrDataURL = await qrcode.toDataURL(qrCode.url);

        // Base64 verisini PNG'ye çevir
        const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // PNG olarak gönder
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `inline; filename="qrcode-${qrCodeId}.png"`);
        return res.send(imageBuffer);

    } catch (error: any) {
        console.error('❌ QR kod görüntüsü oluşturma hatası:', error);
        return res.status(500).json({ error: error.message || 'QR kod görüntüsü oluşturulurken bir hata oluştu' });
    }
};

// Yeni QR kodu oluşturmak için gerçek controller fonksiyonu
const generateQRCode = async (req: express.Request, res: express.Response) => {
    try {
        const { surveyId } = req.params;
        console.log(`➕ Yeni QR kod oluşturuluyor - Anket: ${surveyId}`);

        if (!mongoose.Types.ObjectId.isValid(surveyId)) {
            return res.status(400).json({ error: 'Geçersiz anket ID' });
        }

        // Anketi bul
        const survey = await Survey.findById(surveyId);

        if (!survey) {
            return res.status(404).json({ error: 'Anket bulunamadı' });
        }

        // Benzersiz bir kod oluştur
        const uniqueCode = generateUniqueQRCode(surveyId, survey.title);

        // Anket URL'sini oluştur
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const surveyUrl = `${baseUrl}/survey/code/${uniqueCode}`;

        // QR kod verisini oluştur
        const qrDataURL = await qrcode.toDataURL(surveyUrl);

        // QR kodu veritabanına kaydet
        const qrCode = new QRCode({
            businessId: survey.business,
            business: survey.business,
            surveyId: survey._id,
            survey: survey._id,
            code: uniqueCode,
            url: surveyUrl,
            isActive: true,
            surveyTitle: survey.title,
            description: "Yeni oluşturulan QR Kod"
        });

        await qrCode.save();
        console.log(`✅ Yeni QR kod oluşturuldu: ${qrCode._id}`);

        return res.status(201).json({
            success: true,
            qrCode,
            dataUrl: qrDataURL
        });

    } catch (error: any) {
        console.error('❌ QR kod oluşturma hatası:', error);
        return res.status(500).json({ error: error.message || 'QR kod oluşturulurken bir hata oluştu' });
    }
};

// Benzersiz QR kod oluşturma yardımcı fonksiyonu
const generateUniqueQRCode = (surveyId: string | mongoose.Types.ObjectId, surveyTitle: string, index = 0): string => {
    // Anket ID'nin son kısmını al
    const idString = surveyId.toString();
    const shortId = idString.substr(-4);

    // Anket başlığını kısalt ve temizle
    const cleanTitle = surveyTitle
        .toLowerCase()
        .replace(/[ğ]/g, 'g')
        .replace(/[ü]/g, 'u')
        .replace(/[ş]/g, 's')
        .replace(/[ı]/g, 'i')
        .replace(/[ö]/g, 'o')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 10); // Maksimum 10 karakter

    // Benzersiz bir zaman damgası ekle
    const timestamp = Date.now();
    const timeCode = timestamp.toString(36).substr(-4);

    // İndeks varsa ekle
    const indexPart = index > 0 ? `-${index}` : '';

    // Tüm parçaları birleştir
    return `S${shortId}-${cleanTitle}${indexPart}-${timeCode}`;
};

// Temel fonksiyonlar için dummy fonksiyonlar - gerekliyse kullanılır
const dummySuccess = (req: express.Request, res: express.Response) => {
    console.log('Dummy success endpoint called:', req.originalUrl);
    return res.status(200).json({ success: true });
};

// QR kod rotalarını gerçek fonksiyonlara bağla
router.get('/qr/business/:businessId', getBusinessQRCodes);
router.get('/qr/survey/:surveyId', getSurveyQRCodes);
router.get('/qr/image/:qrCodeId', getQRCodeImage);

// Tekil bir QR kod detayını almak için endpoint (yeni)
router.get('/qr/:qrCodeId', async (req, res) => {
    try {
        const { qrCodeId } = req.params;
        console.log(`🔍 QR kod detayları isteniyor: ${qrCodeId}`);

        if (!mongoose.Types.ObjectId.isValid(qrCodeId)) {
            return res.status(400).json({ error: 'Geçersiz QR kod ID' });
        }

        // QR kodu bul
        const qrCode = await QRCode.findById(qrCodeId)
            .populate('survey', 'title description');

        if (!qrCode) {
            return res.status(404).json({ error: 'QR kod bulunamadı' });
        }

        console.log(`✅ QR kod bulundu: ${qrCode.code}`);
        return res.status(200).json(qrCode);

    } catch (error: any) {
        console.error('❌ QR kod detayları getirme hatası:', error);
        return res.status(500).json({ error: error.message || 'QR kod detayları getirilirken bir hata oluştu' });
    }
});

router.post('/qr/scan', dummySuccess); // Bu endpoint ihtiyaç olursa gerçek implementasyonla değiştirilecek
router.put('/qr/:qrCodeId', dummySuccess); // Bu endpoint ihtiyaç olursa gerçek implementasyonla değiştirilecek
router.delete('/qr/cleanup', dummySuccess); // Bu endpoint ihtiyaç olursa gerçek implementasyonla değiştirilecek
router.delete('/qr/:qrCodeId', async (req, res) => {
    try {
        const { qrCodeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(qrCodeId)) {
            return res.status(400).json({ error: 'Geçersiz QR kod ID' });
        }

        // QR kodu sil
        const result = await QRCode.findByIdAndDelete(qrCodeId);

        if (!result) {
            return res.status(404).json({ error: 'QR kod bulunamadı' });
        }

        return res.status(200).json({
            success: true,
            message: 'QR kod başarıyla silindi'
        });
    } catch (error: any) {
        console.error('❌ QR kod silme hatası:', error);
        return res.status(500).json({ error: error.message || 'QR kod silinirken bir hata oluştu' });
    }
});
router.post('/qr/:surveyId', generateQRCode);

// ---------------------- 3. İŞLETME İLE İLGİLİ ROTALAR ----------------------
console.log('✓ İşletme rotaları tanımlanıyor...');
// Daha esnek erişim izni - koruma middleware'ini kaldır
// Tüm erişim izinlerini controller içinde kontrol edeceğiz
router.get('/business/:businessId', getBusinessSurveys);

// Kimlik doğrulama gerektiren alternatif endpoints
router.get('/all', protect, getBusinessSurveys);

// Middleware ile business ID'yi kullanıcıdan alma
router.get('/by-user-business', protect, (req, res, next) => {
    // Kullanıcının business ID'sini req.params.businessId'ye kopyala
    if (req.user && req.user.business) {
        req.params.businessId = req.user.business.toString();
        console.log('İşletme ID kullanıcıdan kopyalandı:', req.params.businessId);
        return next();
    }

    // Business ID yoksa boş dizi döndür
    console.warn('Kullanıcıda business ID bulunamadı');
    return res.status(200).json([]);
}, getBusinessSurveys);

// Yeni - işletmeye ait tüm anket yanıtlarını getir
router.get('/business/:businessId/responses', protect, checkBusinessAdminOrSuperAdmin, async (req, res) => {
    try {
        const { businessId } = req.params;
        console.log(`🔍 İşletmeye ait yanıtlar getiriliyor, İşletme ID: ${businessId}`);

        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({ error: 'Geçersiz işletme ID' });
        }

        // İşletmeye ait tüm yanıtları getir
        const responses = await Response.find({ business: businessId })
            .populate({
                path: 'survey',
                select: 'title description'
            })
            .populate({
                path: 'customer',
                select: 'name email'
            })
            .sort({ createdAt: -1 });

        console.log(`✅ ${responses.length} adet yanıt bulundu`);
        return res.status(200).json(responses);
    } catch (error: any) {
        console.error('❌ Yanıtları getirme hatası:', error);
        return res.status(500).json({ error: error.message || 'Yanıtlar getirilirken bir hata oluştu' });
    }
});

// Spesifik bir anketin yanıtlarını getir
router.get('/:surveyId/responses', protect, checkBusinessAdminOrSuperAdmin, async (req, res) => {
    try {
        const { surveyId } = req.params;
        console.log(`🔍 Ankete ait yanıtlar getiriliyor, Anket ID: ${surveyId}`);

        if (!mongoose.Types.ObjectId.isValid(surveyId)) {
            return res.status(400).json({ error: 'Geçersiz anket ID' });
        }

        // Anketi bul
        const survey = await Survey.findById(surveyId);

        if (!survey) {
            return res.status(404).json({ error: 'Anket bulunamadı' });
        }

        // Kullanıcının bu ankete erişim izni var mı kontrol et
        if (req.user.role !== UserRole.SUPER_ADMIN) {
            if (req.user.business?.toString() !== survey.business.toString()) {
                return res.status(403).json({ error: 'Bu ankete erişim izniniz yok' });
            }
        }

        // Ankete ait tüm yanıtları getir
        const responses = await Response.find({ survey: surveyId })
            .populate({
                path: 'customer',
                select: 'name email'
            })
            .sort({ createdAt: -1 });

        console.log(`✅ ${responses.length} adet yanıt bulundu`);
        return res.status(200).json(responses);
    } catch (error: any) {
        console.error('❌ Yanıtları getirme hatası:', error);
        return res.status(500).json({ error: error.message || 'Yanıtlar getirilirken bir hata oluştu' });
    }
});

// ---------------------- 4. TEMEL ANKET CRUD İŞLEMLERİ ----------------------
console.log('✓ Ana CRUD rotaları tanımlanıyor...');

// POST - Anket Oluşturma - Özel loglama ekle
router.post('/',
    (req, res, next) => {
        console.log('📣 POST /api/surveys endpointi çağrıldı');
        console.log('📦 İstek gövdesi:', {
            ...req.body,
            questions: req.body.questions ? `${req.body.questions.length} adet soru` : 'Sorular bulunamadı'
        });
        console.log('👤 Kullanıcı:', req.user ? {
            id: req.user.id,
            role: req.user.role,
            business: req.user.business
        } : 'Kullanıcı bilgisi yok');
        next();
    },
    protect,
    flexibleRoleCheck,
    createSurvey
);

// Alternatif anket oluşturma endpoint'i - debug mode etkin
router.post('/create',
    (req, res, next) => {
        console.log('📣 POST /api/surveys/create endpointi çağrıldı - Debug modu');
        next();
    },
    protect,
    debugRoleCheck,
    createSurvey
);

// GET - Anket Detayı
router.get('/:surveyId', protect, checkBusinessAdminOrSuperAdmin, getSurvey);

// PUT - Anket Güncelleme
router.put('/:surveyId', protect, checkBusinessAdminOrSuperAdmin, updateSurvey);

// DELETE - Anket Silme
router.delete('/:surveyId', protect, flexibleRoleCheck, deleteSurvey);

// DELETE - Alternatif URL formatları için ek rotalar
console.log('✓ Alternatif silme rotaları tanımlanıyor...');
router.delete('/delete/:surveyId', protect, flexibleRoleCheck, deleteSurvey);
router.delete('/remove/:surveyId', protect, flexibleRoleCheck, deleteSurvey);
router.delete('/id/:surveyId', protect, flexibleRoleCheck, deleteSurvey);

// POST ile silme (DELETE metodunun desteklenmediği durumlar için)
router.post('/:surveyId/delete', protect, flexibleRoleCheck, deleteSurvey);
router.post('/delete/:surveyId', protect, flexibleRoleCheck, deleteSurvey);

// Veritabanı işlemleri için özel rota
router.post('/db-operations', protect, authorize(UserRole.SUPER_ADMIN), async (req, res) => {
    try {
        const { operation, surveyId } = req.body;

        console.log(`🛠️ Veritabanı işlemi isteği: ${operation}, Anket: ${surveyId}`);

        if (!operation) {
            return res.status(400).json({ error: 'İşlem türü belirtilmedi' });
        }

        if (operation === 'deleteSurvey' && surveyId) {
            if (!mongoose.Types.ObjectId.isValid(surveyId)) {
                return res.status(400).json({ error: 'Geçersiz anket ID' });
            }

            // İlişkili QR kodlarını sil
            const qrDeleteResult = await mongoose.model('QRCode').deleteMany({ survey: surveyId });

            // Anketi sil
            const deleteResult = await Survey.deleteOne({ _id: surveyId });

            if (deleteResult.deletedCount === 0) {
                return res.status(404).json({ error: 'Anket bulunamadı veya silinemedi' });
            }

            return res.status(200).json({
                message: 'Anket başarıyla silindi (veritabanı işlemi)',
                qrCodesDeleted: qrDeleteResult.deletedCount,
                surveysDeleted: deleteResult.deletedCount
            });
        }

        // Diğer veritabanı işlemleri buraya eklenebilir

        return res.status(400).json({ error: 'Desteklenmeyen işlem' });
    } catch (error: any) {
        console.error('Veritabanı işlemi hatası:', error);
        return res.status(500).json({ error: error.message || 'Bilinmeyen bir hata oluştu' });
    }
});

// SUPER ADMIN - ÖZEL YÖNETİM ENDPOINTİ
router.post('/admin-operations', protect, authorize(UserRole.SUPER_ADMIN), async (req, res) => {
    try {
        const { operation, surveyId, data } = req.body;

        console.log(`🔧 Yönetici işlemi: ${operation}`);
        console.log('İşlem detayları:', req.body);

        // İlgili anketi bul (gerekirse)
        let survey = null;
        if (surveyId && mongoose.Types.ObjectId.isValid(surveyId)) {
            survey = await Survey.findById(surveyId);
        }

        switch (operation) {
            case 'forceSurveyDelete':
                if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) {
                    return res.status(400).json({ error: 'Geçersiz anket ID' });
                }

                // QR kodlarını sil
                await mongoose.model('QRCode').deleteMany({ survey: surveyId });

                // Yanıtları sil (varsa)
                if (mongoose.models.Response) {
                    await mongoose.model('Response').deleteMany({ survey: surveyId });
                }

                // Anketi sil
                const deleteResult = await Survey.findByIdAndDelete(surveyId);

                return res.status(200).json({
                    message: 'Anket ve ilgili tüm veriler zorla silindi',
                    success: true,
                    survey: deleteResult
                });

            case 'disableSurvey':
                if (!survey) {
                    return res.status(404).json({ error: 'Anket bulunamadı' });
                }

                // Sadece aktiflik durumunu güncelle - silme değil
                survey.isActive = false;
                await survey.save();

                return res.status(200).json({
                    message: 'Anket pasif duruma alındı',
                    success: true,
                    survey
                });

            case 'findSurvey':
                // MongoDB sorgusu ile anket(ler) bul
                const query = data?.query || {};
                const foundSurveys = await Survey.find(query).limit(10);

                return res.status(200).json({
                    count: foundSurveys.length,
                    surveys: foundSurveys
                });

            default:
                return res.status(400).json({ error: 'Desteklenmeyen işlem' });
        }
    } catch (error: any) {
        console.error('Admin işlemi hatası:', error);
        return res.status(500).json({ error: error.message || 'Bilinmeyen bir hata oluştu' });
    }
});

// Yükleme tamamlandı
console.log('✅ Survey rotaları başarıyla yüklendi!');

export default router; 