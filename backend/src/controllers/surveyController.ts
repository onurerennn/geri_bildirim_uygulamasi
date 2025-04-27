import { Request, Response as ExpressResponse } from 'express';
import { Survey, QRCode, Business, Response } from '../models';
import mongoose from 'mongoose';
import { UserRole } from '../types/UserRole';
import qrcode from 'qrcode';
import { IQuestion } from '../models/Survey';
import asyncHandler from 'express-async-handler';

// @desc    Get active surveys
// @route   GET /api/surveys/active
// @access  Public
export const getActiveSurveys = async (req: Request, res: ExpressResponse) => {
    try {
        const surveys = await Survey.find({ isActive: true })
            .populate('business', 'name')
            .populate('createdBy', 'name email');

        res.status(200).json(surveys);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get business surveys
// @route   GET /api/surveys/business/:businessId
// @access  Private/Business
export const getBusinessSurveys = async (req: Request, res: ExpressResponse) => {
    try {
        const { businessId } = req.params;

        console.log('Getting surveys for business:', businessId);
        console.log('User requesting surveys:', {
            userId: req.user?._id,
            userRole: req.user?.role,
            userBusiness: req.user?.business
        });

        // Validate businessId
        if (!businessId || businessId === 'undefined' || businessId === 'null') {
            console.error('Missing or invalid business ID:', businessId);
            return res.status(200).json([]); // Return empty array instead of error
        }

        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            console.error('Invalid business ID format:', businessId);
            return res.status(200).json([]); // Return empty array instead of error
        }

        // Check if user has permission to access this business's surveys
        if (req.user.role === UserRole.BUSINESS_ADMIN &&
            req.user.business?.toString() !== businessId) {
            console.error('User tried to access surveys from another business');
            console.error('User business:', req.user.business, 'Requested business:', businessId);
            return res.status(403).json({
                success: false,
                error: 'Bu işletmenin anketlerine erişim yetkiniz yok'
            });
        }

        // Find business to confirm it exists
        const business = await Business.findById(businessId);
        if (!business) {
            console.error('Business not found with ID:', businessId);
            return res.status(200).json([]); // Return empty array instead of error
        }

        console.log('Found business:', business.name);

        // Fetch surveys for this business
        const surveys = await Survey.find({ business: businessId })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email');

        console.log(`Found ${surveys.length} surveys for business ${businessId}`);

        // Fetch QR codes for each survey
        const surveysWithQrCodes = await Promise.all(
            surveys.map(async (survey) => {
                // Try to find QR codes using both field naming conventions
                const qrCodes = await QRCode.find({
                    $or: [
                        { surveyId: survey._id },
                        { survey: survey._id }
                    ]
                });
                console.log(`Found ${qrCodes.length} QR codes for survey ${survey._id}`);
                const surveyObj = survey.toObject();
                return {
                    ...surveyObj,
                    qrCodes
                };
            })
        );

        // Return success response with surveys data
        res.status(200).json(surveysWithQrCodes);
    } catch (error: any) {
        console.error('Error in getBusinessSurveys:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Anketler getirilirken bir hata oluştu'
        });
    }
};

// @desc    Get a single survey
// @route   GET /api/surveys/:id
// @access  Public
export const getSurvey = async (req: Request, res: ExpressResponse) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Geçersiz anket ID' });
        }

        const survey = await Survey.findById(id)
            .populate('business', 'name')
            .populate('createdBy', 'name email');

        if (!survey) {
            return res.status(404).json({ error: 'Anket bulunamadı' });
        }

        // Anketin QR kodlarını getir
        const qrCodes = await QRCode.find({ survey: survey._id });

        res.status(200).json({
            ...survey.toObject(),
            qrCodes
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get a single survey by QR code
// @route   GET /api/surveys/code/:code
// @access  Public
export const getSurveyByCode = async (req: Request, res: ExpressResponse) => {
    try {
        const { code } = req.params;

        if (!code) {
            return res.status(400).json({ error: 'Geçersiz QR kodu' });
        }

        console.log(`QR kod ile anket aranıyor: ${code}`);

        // QR kodu ile QR kod kaydını bul
        const qrCode = await QRCode.findOne({ code });

        if (!qrCode) {
            console.log(`QR kod bulunamadı: ${code}`);
            return res.status(404).json({ error: 'QR kod bulunamadı' });
        }

        // QR kodun aktif olup olmadığını kontrol et
        if (!qrCode.isActive) {
            console.log(`QR kod aktif değil: ${code}`);
            return res.status(400).json({ error: 'Bu QR kod artık aktif değil' });
        }

        // QR kodu ilişkili anketi getir
        const surveyId = qrCode.surveyId || qrCode.survey;

        if (!surveyId) {
            console.log(`QR koda bağlı bir anket ID bulunamadı: ${code}`);
            return res.status(404).json({ error: 'QR kod bir ankete bağlı değil' });
        }

        // Anket ID'sini string'e dönüştür
        const surveyIdStr = surveyId.toString();
        if (!mongoose.Types.ObjectId.isValid(surveyIdStr)) {
            console.log(`QR koda bağlı geçerli bir anket ID formatı değil: ${code}`);
            return res.status(404).json({ error: 'QR kod geçerli bir ankete bağlı değil' });
        }

        const survey = await Survey.findById(surveyId)
            .populate('business', 'name')
            .populate('createdBy', 'name email');

        if (!survey) {
            console.log(`Anket bulunamadı: ${surveyId}`);
            return res.status(404).json({ error: 'Anket bulunamadı' });
        }

        // Anketin aktif olup olmadığını kontrol et
        if (!survey.isActive) {
            console.log(`Anket aktif değil: ${surveyId}`);
            return res.status(400).json({ error: 'Bu anket artık aktif değil' });
        }

        // Anketin başlangıç ve bitiş tarihini kontrol et
        const now = new Date();
        if (survey.startDate && new Date(survey.startDate) > now) {
            console.log(`Anket henüz başlamadı: ${surveyId}`);
            return res.status(400).json({
                error: 'Bu anket henüz başlamadı',
                startDate: survey.startDate
            });
        }

        if (survey.endDate && new Date(survey.endDate) < now) {
            console.log(`Anketin süresi doldu: ${surveyId}`);
            return res.status(400).json({
                error: 'Bu anketin süresi doldu',
                endDate: survey.endDate
            });
        }

        console.log(`QR kod ile anket bulundu: ${surveyId}`);

        // Anketin diğer QR kodlarını getir (opsiyonel)
        const allQrCodes = await QRCode.find({
            $or: [
                { surveyId: survey._id },
                { survey: survey._id }
            ]
        });

        res.status(200).json({
            ...survey.toObject(),
            qrCodes: allQrCodes,
            scannedQrCode: qrCode,
            scannedAt: new Date()
        });
    } catch (error: any) {
        console.error('QR kod ile anket alma hatası:', error);
        res.status(500).json({ error: error.message });
    }
};

// Benzersiz QR kod oluşturma yardımcı fonksiyonu
const generateUniqueQRCode = (surveyId: string | mongoose.Types.ObjectId, surveyTitle: string, index = 0): string => {
    // Anket ID'nin son kısmını al
    const idString = surveyId.toString();
    const shortId = idString.substr(-4);

    // Anket başlığını kısalt ve temizle (boşlukları tire ile değiştir, türkçe karakterleri kaldır, sadece alfanumerik karakterler kalsın)
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

    // Benzersiz bir zaman damgası oluştur (milisaniye cinsinden)
    const timestamp = Date.now();

    // Zaman damgasının son kısmını base36 olarak al (daha kısa bir string için)
    const timeCode = timestamp.toString(36).substr(-4);

    // İndeks varsa ekle (örn. ek QR kodlar için)
    const indexPart = index > 0 ? `-${index}` : '';

    // Tüm parçaları birleştir: S (Sonra anket kısaltması) - Kısa anket başlığı - Zaman kodu
    return `S${shortId}-${cleanTitle}${indexPart}-${timeCode}`;
};

// @desc    Create a new survey
// @route   POST /api/surveys
// @access  Private/Business
export const createSurvey = async (req: Request, res: ExpressResponse) => {
    console.log('💡 createSurvey controller çağrıldı');
    console.log('📝 Gelen veri:', {
        body: { ...req.body, questions: `${req.body.questions?.length || 0} adet soru` },
        user: req.user ? {
            id: req.user.id,
            role: req.user.role,
            business: req.user.business || null
        } : 'Kullanıcı bilgisi yok'
    });

    try {
        const { title, description, questions, startDate, endDate } = req.body;

        // İşletme ve kullanıcı bilgilerini kontrol et
        if (!req.user) {
            console.error('❌ Kullanıcı bilgisi eksik, yetkilendirme yapılamadı');
            return res.status(401).json({ error: 'Kullanıcı bilgisi bulunamadı, lütfen tekrar giriş yapın' });
        }

        let businessId;

        // Kullanıcı rolüne göre işletme belirleme
        if (req.user.role === UserRole.BUSINESS_ADMIN) {
            // İş yeri yöneticisi ise, kendisine atanmış işletmeyi kullan
            if (!req.user.business) {
                console.error('❌ İşletme yöneticisine atanmış işletme bulunamadı');
                return res.status(400).json({ error: 'İşletme bilgisi eksik, profil bilgilerinizi güncelleyin' });
            }
            businessId = req.user.business;
            console.log('✅ İşletme yöneticisi: İşletme ID', businessId);
        } else if (req.user.role === UserRole.SUPER_ADMIN) {
            // Süper admin ise, body'den gelen işletme ID'sini kullan
            if (!req.body.business) {
                console.error('❌ Süper admin için istek gövdesinde işletme bilgisi yok');
                return res.status(400).json({ error: 'İşletme bilgisi gereklidir' });
            }
            businessId = req.body.business;
            console.log('✅ Süper admin: İşletme ID', businessId);
        } else {
            console.error('❌ Yetkisiz rol:', req.user.role);
            return res.status(403).json({
                success: false,
                error: 'Bu işlem için yetkiniz bulunmamaktadır',
                details: `Rol: ${req.user.role}, gereken rol: BUSINESS_ADMIN veya SUPER_ADMIN`
            });
        }

        if (!businessId) {
            console.error('❌ İşletme ID bulunamadı');
            return res.status(400).json({ error: 'İşletme bilgisi gereklidir' });
        }

        try {
            // businessId'yi string'e çevirmeye çalış (gerekirse)
            const businessIdStr = typeof businessId === 'object' && businessId !== null && '_id' in businessId
                ? businessId._id.toString()
                : businessId.toString();

            if (!mongoose.Types.ObjectId.isValid(businessIdStr)) {
                console.error('❌ Geçersiz işletme ID formatı:', businessId);
                return res.status(400).json({ error: 'Geçersiz işletme ID' });
            }

            // ID'yi doğru formatta ayarla
            businessId = new mongoose.Types.ObjectId(businessIdStr);
        } catch (idError) {
            console.error('❌ İşletme ID dönüştürme hatası:', idError);
            return res.status(400).json({ error: 'Geçersiz işletme ID formatı' });
        }

        // İşletmenin varlığını kontrol et
        const business = await Business.findById(businessId);
        if (!business) {
            console.error('❌ İşletme bulunamadı:', businessId);
            return res.status(404).json({ error: 'İşletme bulunamadı' });
        }

        console.log('✅ Anket oluşturma doğrulamaları başarılı, veritabanına kaydediliyor...');

        // Soruların geçerliliğini kontrol et
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            console.error('❌ Sorular eksik veya geçersiz format');
            return res.status(400).json({ error: 'En az bir soru eklemelisiniz' });
        }

        // Anket oluştur
        const survey = new Survey({
            title,
            description,
            questions,
            business: businessId,
            startDate: startDate || new Date(),
            endDate,
            createdBy: req.user.id
        });

        // Önce anketi veritabanına kaydet
        const savedSurvey = await survey.save();
        console.log('✅ Anket başarıyla kaydedildi, ID:', savedSurvey._id);

        // Anket veritabanına başarıyla kaydedildiyse QR kodları oluştur
        if (savedSurvey && savedSurvey._id) {
            console.log('✅ QR kodları oluşturuluyor...');

            // Birden fazla QR Kodu oluştur
            const qrCodes = [];
            const baseUrl = process.env.FRONTEND_URL || 'https://feedback.app';

            try {
                // Ana QR kodu oluştur (index = 0)
                const mainUniqueCode = generateUniqueQRCode(savedSurvey._id as mongoose.Types.ObjectId, savedSurvey.title);
                const mainSurveyUrl = `${baseUrl}/survey/code/${mainUniqueCode}`;

                const mainQRCode = new QRCode({
                    businessId: businessId,
                    business: businessId,
                    surveyId: savedSurvey._id,
                    survey: savedSurvey._id,
                    code: mainUniqueCode,
                    url: mainSurveyUrl,
                    isActive: true,
                    surveyTitle: savedSurvey.title,
                    description: "Ana QR Kod"
                });

                await mainQRCode.save();
                qrCodes.push(mainQRCode);
                console.log('✅ Ana QR Kod oluşturuldu:', mainQRCode._id);

                // 3 adet ek QR kodu oluştur (indeksler: 1, 2, 3)
                for (let i = 1; i <= 3; i++) {
                    const uniqueCode = generateUniqueQRCode(savedSurvey._id as mongoose.Types.ObjectId, savedSurvey.title, i);
                    const surveyUrl = `${baseUrl}/survey/code/${uniqueCode}`;

                    const qrCode = new QRCode({
                        businessId: businessId,
                        business: businessId,
                        surveyId: savedSurvey._id,
                        survey: savedSurvey._id,
                        code: uniqueCode,
                        url: surveyUrl,
                        isActive: true,
                        surveyTitle: savedSurvey.title,
                        description: `Ek QR Kod ${i}`
                    });

                    await qrCode.save();
                    qrCodes.push(qrCode);
                    console.log(`✅ Ek QR Kod ${i} oluşturuldu:`, qrCode._id);
                }

                // Anketi QR kodlarla birlikte döndür
                return res.status(201).json({
                    success: true,
                    survey: savedSurvey,
                    qrCodes: qrCodes,
                    message: 'Anket başarıyla oluşturuldu ve 4 adet QR kod oluşturuldu'
                });

            } catch (qrError) {
                console.error('❌ QR kodları oluşturulurken hata:', qrError);
                // QR kod oluşturulamadıysa bile anket oluşturuldu, ancak hatayı bildir
                return res.status(201).json({
                    success: true,
                    warning: 'QR kodları oluşturulamadı, ancak anket kaydedildi',
                    survey: savedSurvey,
                    error: qrError instanceof Error ? qrError.message : 'QR kod oluşturma hatası'
                });
            }
        } else {
            console.error('❌ Anket kaydedildi ancak ID bilgisi alınamadı');
            return res.status(500).json({ error: 'Anket kaydedildi ancak ID bilgisi alınamadı' });
        }
    } catch (error: any) {
        console.error('❌ Anket oluşturma hatası:', error);
        return res.status(500).json({
            error: 'Anket oluşturulurken bir hata oluştu',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Update a survey
// @route   PUT /api/surveys/:id
// @access  Private/Business
export const updateSurvey = async (req: Request, res: ExpressResponse) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Geçersiz anket ID' });
        }

        // Önce anketi bul
        const survey = await Survey.findById(id);
        if (!survey) {
            return res.status(404).json({ error: 'Anket bulunamadı' });
        }

        // Yetki kontrolü
        if (req.user.role !== UserRole.SUPER_ADMIN) {
            // İşletme yöneticisi sadece kendi işletmesinin anketlerini güncelleyebilir
            if (req.user.role === UserRole.BUSINESS_ADMIN &&
                survey.business.toString() !== req.user.business?.toString()) {
                return res.status(403).json({ error: 'Bu anketi güncelleme yetkiniz bulunmamaktadır' });
            }
        }

        // Güncelleme işlemi
        const updatedSurvey = await Survey.findByIdAndUpdate(id, updates, { new: true });

        res.status(200).json(updatedSurvey);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Delete a survey
// @route   DELETE /api/surveys/:id
// @access  Private/Business
export const deleteSurvey = async (req: Request, res: ExpressResponse) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Geçersiz anket ID' });
        }

        // Önce anketi bul
        const survey = await Survey.findById(id);
        if (!survey) {
            return res.status(404).json({ error: 'Anket bulunamadı' });
        }

        // Yetki kontrolü
        if (req.user.role !== UserRole.SUPER_ADMIN) {
            // İşletme yöneticisi sadece kendi işletmesinin anketlerini silebilir
            if (req.user.role === UserRole.BUSINESS_ADMIN &&
                survey.business.toString() !== req.user.business?.toString()) {
                return res.status(403).json({ error: 'Bu anketi silme yetkiniz bulunmamaktadır' });
            }
        }

        // İlişkili QR kodlarını da sil
        await QRCode.deleteMany({ survey: id });

        // Anketi sil
        await Survey.findByIdAndDelete(id);

        res.status(200).json({ message: 'Anket ve ilişkili QR kodları başarıyla silindi' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Generate a new QR code
// @route   POST /api/surveys/qr
// @access  Private/Business
export const generateQRCode = async (req: Request, res: ExpressResponse) => {
    try {
        const { surveyId } = req.params;
        const user = req.user;

        if (!mongoose.Types.ObjectId.isValid(surveyId)) {
            return res.status(400).json({ message: 'Invalid survey ID' });
        }

        const survey = await Survey.findById(surveyId);

        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }

        // Check if user is authorized to generate QR code for this survey
        if (user.role === UserRole.BUSINESS_ADMIN && survey.business.toString() !== user.business?.toString()) {
            return res.status(403).json({ message: 'Not authorized to generate QR code for this survey' });
        }

        // Generate a unique code using helper function
        const uniqueCode = generateUniqueQRCode(survey._id, survey.title);

        // Create survey URL
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
        const surveyUrl = `${frontendURL}/survey/code/${uniqueCode}`;

        // Generate QR code data URL
        const qrCodeDataUrl = await qrcode.toDataURL(surveyUrl);

        // Save QR code in database
        const newQRCode = new QRCode({
            code: uniqueCode,
            surveyId: survey._id,
            survey: survey._id,  // For backward compatibility
            businessId: survey.business,
            business: survey.business,  // For backward compatibility
            url: surveyUrl,
            isActive: true,
            surveyTitle: survey.title
        });

        await newQRCode.save();

        res.status(201).json({
            qrCode: newQRCode,
            dataUrl: qrCodeDataUrl
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ message: 'Error generating QR code', error });
    }
};

// @desc    Get business QR codes
// @route   GET /api/surveys/qr/business/:businessId
// @access  Private/Business
export const getBusinessQRCodes = async (req: Request, res: ExpressResponse) => {
    try {
        const { businessId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            res.status(400).json({ message: 'Invalid business ID' });
            return;
        }

        // Anket başlığı ile birlikte QR kodları getir, populate kullanarak
        const qrCodes = await QRCode.find({ businessId })
            .populate('surveyId', 'title')
            .populate('survey', 'title')
            .sort({ createdAt: -1 });

        // QR kodları için anket başlıklarını kontrol et ve güncelle
        const qrCodesWithTitles = qrCodes.map(qrCode => {
            const qrCodeObj = qrCode.toObject();

            // surveyTitle zaten varsa kullan, yoksa populateden al
            if (!qrCodeObj.surveyTitle || qrCodeObj.surveyTitle === '') {
                // Populated surveyId veya survey objelerinden başlığı al
                let surveyTitle = 'Bilinmeyen Anket';

                if (qrCodeObj.surveyId && typeof qrCodeObj.surveyId === 'object') {
                    // Başlık özelliğini kontrol et
                    const surveyIdObj = qrCodeObj.surveyId as any;
                    if (surveyIdObj.title) {
                        surveyTitle = surveyIdObj.title;
                    }
                } else if (qrCodeObj.survey && typeof qrCodeObj.survey === 'object') {
                    // Başlık özelliğini kontrol et
                    const surveyObj = qrCodeObj.survey as any;
                    if (surveyObj.title) {
                        surveyTitle = surveyObj.title;
                    }
                }

                // Veritabanında QR kod kaydını güncelle
                QRCode.findByIdAndUpdate(qrCode._id, { surveyTitle: surveyTitle }).catch(err => {
                    console.error(`QR kod başlık güncellemesi başarısız: ${qrCode._id}`, err);
                });

                qrCodeObj.surveyTitle = surveyTitle;
            }

            return qrCodeObj;
        });

        res.status(200).json(qrCodesWithTitles);
    } catch (error) {
        console.error('Error getting business QR codes:', error);
        res.status(500).json({ message: 'Error getting business QR codes', error });
    }
};

/**
 * @desc    Get all QR codes associated with a specific survey
 * @route   GET /api/surveys/qr/survey/:surveyId
 * @access  Private (Business Admin, Super Admin)
 */
export const getSurveyQRCodes = asyncHandler(async (req: Request, res: ExpressResponse) => {
    const { surveyId } = req.params;

    // Validate surveyId
    if (!mongoose.Types.ObjectId.isValid(surveyId)) {
        res.status(400).json({ error: 'Invalid survey ID' });
        return;
    }

    // Find survey to ensure it exists
    const survey = await Survey.findById(surveyId);
    if (!survey) {
        res.status(404).json({ error: 'Survey not found' });
        return;
    }

    // Get all QR codes for this survey
    const qrCodes = await QRCode.find({ surveyId });

    // Add survey title to each QR code for better display
    const qrCodesWithTitle = qrCodes.map(qrCode => {
        const qrCodeObj = qrCode.toObject();
        qrCodeObj.surveyTitle = survey.title;
        return qrCodeObj;
    });

    res.status(200).json(qrCodesWithTitle);
});

// @desc    Submit a survey response
// @route   POST /api/surveys/:id/responses
// @access  Public
export const submitSurveyResponse = async (req: Request, res: ExpressResponse) => {
    try {
        const { surveyId, answers } = req.body;

        if (!surveyId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate the surveyId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(surveyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid survey ID'
            });
        }

        // Get the survey
        const survey = await Survey.findById(surveyId).populate('business').exec();
        if (!survey) {
            return res.status(404).json({
                success: false,
                message: 'Survey not found'
            });
        }

        // Check if the survey is active
        if (!survey.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Survey is not active'
            });
        }

        // Validate that all required questions are answered
        const requiredQuestions = survey.questions.filter(q => q.required);

        // Map question IDs - need to convert Mongoose document subdocuments to string IDs
        const requiredQuestionIds = requiredQuestions.map(q => {
            // For Mongoose subdocuments, access the _id directly
            // The _id exists on the mongoose subdocument but not on the IQuestion interface
            return (q as any)._id?.toString();
        }).filter(id => id !== undefined);

        // Get the IDs of the questions that were answered
        const answeredQuestionIds = answers.map(a => a.questionId);

        // Check if all required questions are answered
        const missingRequiredQuestions = requiredQuestionIds.filter(
            id => !answeredQuestionIds.includes(id as string)
        );

        if (missingRequiredQuestions.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing answers for required questions'
            });
        }

        // Create the response
        const response = new Response({
            survey: surveyId,
            answers: answers.map(a => ({
                question: a.questionId,
                value: a.value
            })),
            business: survey.business,
            ...(req.user ? { customer: req.user.id } : {})
        });

        await response.save();

        return res.status(201).json({
            success: true,
            message: 'Response submitted successfully',
            data: response
        });
    } catch (error) {
        console.error('Error submitting survey response:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit survey response'
        });
    }
};

// @desc    Clean up invalid QR codes
// @route   DELETE /api/surveys/qr/cleanup
// @access  Private/Admin
export const cleanupInvalidQRCodes = async (req: Request, res: ExpressResponse) => {
    try {
        console.log('QR Kod temizleme işlemi başlatılıyor...');

        // Sadece SuperAdmin rolünün bu işlemi yapmasına izin ver
        if (req.user.role !== UserRole.SUPER_ADMIN) {
            return res.status(403).json({
                success: false,
                message: 'Bu işlemi sadece yöneticiler yapabilir'
            });
        }

        // Tüm QR kodları getir
        const allQRCodes = await QRCode.find({});
        console.log(`Toplam ${allQRCodes.length} QR kod bulundu.`);

        let removedCount = 0;
        let validCount = 0;
        const invalidQRCodes = [];

        // Her QR kod için anket varlığını kontrol et
        for (const qrCode of allQRCodes) {
            const surveyId = qrCode.surveyId || qrCode.survey;

            if (!surveyId) {
                // Anket ID'si olmayan QR kodları temizle
                invalidQRCodes.push(qrCode._id);
                removedCount++;
                continue;
            }

            // Anketin veritabanında var olup olmadığını kontrol et
            const survey = await Survey.findById(surveyId);

            if (!survey) {
                // Anketi olmayan QR kodu temizle
                invalidQRCodes.push(qrCode._id);
                removedCount++;
            } else {
                validCount++;
            }
        }

        // Geçersiz QR kodlarını toplu şekilde sil
        if (invalidQRCodes.length > 0) {
            await QRCode.deleteMany({ _id: { $in: invalidQRCodes } });
            console.log(`${removedCount} geçersiz QR kod silindi.`);
        }

        res.status(200).json({
            success: true,
            message: `QR kod temizleme işlemi tamamlandı. ${validCount} geçerli, ${removedCount} geçersiz QR kod bulundu.`,
            removed: removedCount,
            valid: validCount
        });
    } catch (error: any) {
        console.error('QR kod temizleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'QR kod temizleme işlemi sırasında bir hata oluştu.',
            error: error.message
        });
    }
};

// @desc    Delete a single QR code
// @route   DELETE /api/surveys/qr/:qrCodeId
// @access  Private/Business
export const deleteQRCode = async (req: Request, res: ExpressResponse) => {
    try {
        const { qrCodeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(qrCodeId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz QR kod ID'
            });
        }

        // QR kodu bul
        const qrCode = await QRCode.findById(qrCodeId);

        if (!qrCode) {
            return res.status(404).json({
                success: false,
                message: 'QR kod bulunamadı'
            });
        }

        // Yetki kontrolü - Sadece ilgili işletmenin adminleri ve süper admin silebilir
        if (req.user.role === UserRole.BUSINESS_ADMIN) {
            // İşletme ID'sini kontrol et
            const businessIdStr = qrCode.businessId.toString();
            const userBusinessIdStr = req.user.business?.toString();

            if (businessIdStr !== userBusinessIdStr) {
                return res.status(403).json({
                    success: false,
                    message: 'Bu QR kodu silme yetkiniz bulunmamaktadır'
                });
            }
        } else if (req.user.role !== UserRole.SUPER_ADMIN) {
            return res.status(403).json({
                success: false,
                message: 'Bu işlem için yetkiniz bulunmamaktadır'
            });
        }

        // QR kodu sil
        await QRCode.findByIdAndDelete(qrCodeId);

        res.status(200).json({
            success: true,
            message: 'QR kod başarıyla silindi'
        });
    } catch (error: any) {
        console.error('QR kod silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'QR kod silinirken bir hata oluştu',
            error: error.message
        });
    }
}; 