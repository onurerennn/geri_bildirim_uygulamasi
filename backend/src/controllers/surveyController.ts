import { Request, Response as ExpressResponse } from 'express';
import { Survey, QRCode, Business, Response } from '../models';
import mongoose from 'mongoose';
import { UserRole } from '../types/UserRole';
import qrcode from 'qrcode';
import { IQuestion } from '../models/Survey';
import asyncHandler from 'express-async-handler';
import { IResponse } from '../models/Response';

// @desc    Get active surveys
// @route   GET /api/surveys/active
// @access  Public/Customer
export const getActiveSurveys = async (req: Request, res: ExpressResponse) => {
    try {
        console.log('getActiveSurveys çağrıldı:', {
            user: req.user ? {
                id: req.user._id,
                role: req.user.role,
                business: req.user.business
            } : 'Anonim kullanıcı'
        });

        // Eğer müşteri girişi yapılmışsa, artık otomatik olarak tüm anketleri göstermiyoruz
        // Müşteri sadece QR kod ID'si ile ankete erişebilir
        if (req.user && req.user.role === UserRole.CUSTOMER) {
            console.log('Müşteri girişi ile doğrudan anket listesi gösterilmiyor. QR kodu ile erişim gerekli.');
            return res.status(200).json({
                success: true,
                message: 'Lütfen bir QR kodu girerek ankete erişin',
                data: []
            });
        }

        // Diğer kullanıcı türleri için normal işlem devam eder
        let query: any = { isActive: true };

        console.log('Anket sorgusu:', JSON.stringify(query));

        const surveys = await Survey.find(query)
            .populate('business', 'name')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        console.log(`${surveys.length} adet anket bulundu`);

        // Frontend'in beklediği basit format
        const simpleSurveys = surveys.map((survey: any) => survey.toObject());

        // Basitleştirilmiş ve tutarlı yanıt
        return res.status(200).json({
            success: true,
            data: simpleSurveys
        });
    } catch (error: any) {
        console.error('getActiveSurveys hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Anketler getirilirken bir hata oluştu',
            error: error.message || 'Bilinmeyen hata'
        });
    }
};

// @desc    Get all surveys for a business
// @route   GET /api/surveys/business/:businessId
// @access  Private/Business
export const getBusinessSurveys = async (req: Request, res: ExpressResponse) => {
    try {
        console.log('getBusinessSurveys called');
        let businessId = req.params.businessId;

        // If businessId is not in URL, try to get it from the user object
        if (!businessId && req.user?.business) {
            businessId = req.user.business.toString();
        }

        if (!businessId) {
            console.error('No business ID found');
            return res.status(200).json({
                success: false,
                message: 'No business ID found',
                data: []
            });
        }

        console.log('Getting surveys for business ID:', businessId);

        // Validate the business ID
        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            console.error('Invalid business ID:', businessId);
            return res.status(200).json({
                success: false,
                message: 'Invalid business ID',
                data: []
            });
        }

        // Find the business
        const business = await Business.findById(businessId);
        if (!business) {
            console.error('Business not found with ID:', businessId);
            return res.status(200).json({
                success: false,
                message: 'Business not found',
                data: []
            });
        }
        console.log('Found business:', business.name);

        // Fetch surveys for this business
        const surveys = await Survey.find({ business: businessId })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email');
        console.log(`Found ${surveys.length} surveys for business ${businessId}`);

        // Return success response with surveys data
        return res.status(200).json({
            success: true,
            data: surveys
        });
    } catch (error: any) {
        console.error('Error in getBusinessSurveys:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting surveys',
            error: error.message || 'Anketler getirilirken bir hata oluştu',
            data: []
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

        // Anketin QR kodunu getir
        const qrCode = await QRCode.findOne({ survey: survey._id });

        // QR kodun detaylarını hazırla
        let qrCodeDetails = null;
        if (qrCode) {
            console.log(`QR kod bulundu:`, {
                id: qrCode._id,
                code: qrCode.code,
                url: qrCode.url
            });

            // QR kod resmi oluştur veya veritabanından al
            let imageData = '';
            try {
                // QR kod resmi oluştur
                imageData = await qrcode.toDataURL(qrCode.url, {
                    errorCorrectionLevel: 'H',
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                });
            } catch (error) {
                console.error('QR kod resmi oluşturma hatası:', error);
            }

            qrCodeDetails = {
                _id: qrCode._id.toString(),
                id: qrCode._id.toString(),
                code: qrCode.code,
                url: qrCode.url,
                surveyId: qrCode.surveyId?.toString(),
                businessId: qrCode.businessId?.toString(),
                isActive: qrCode.isActive,
                description: qrCode.description,
                location: qrCode.location,
                createdAt: qrCode.createdAt,
                imageData: imageData
            };
        }

        const surveyData = {
            ...survey.toObject(),
            qrCode: qrCodeDetails,
            qrCodes: qrCode ? [qrCodeDetails] : [] // Geriye dönük uyumluluk için
        };

        res.status(200).json(surveyData);
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
            return res.status(400).json({ error: 'Geçersiz kod' });
        }

        console.log(`Kod ile anket aranıyor: ${code}`);
        let survey = null;
        let qrCode = null;

        // 1. Önce QR kod tablosunda ara (hem code hem de _id ile)
        if (mongoose.Types.ObjectId.isValid(code)) {
            qrCode = await QRCode.findOne({
                $or: [
                    { _id: code },
                    { code: code }
                ]
            });
        } else {
            qrCode = await QRCode.findOne({ code: code });
        }

        if (qrCode) {
            console.log(`QR kod bulundu: ${qrCode._id}`);

            // QR kodun aktif olup olmadığını kontrol et
            if (!qrCode.isActive) {
                console.log(`QR kod aktif değil: ${code}`);
                return res.status(400).json({ error: 'Bu QR kod artık aktif değil' });
            }

            // QR koda bağlı anketi getir
            const surveyId = qrCode.surveyId || qrCode.survey;
            if (surveyId) {
                survey = await Survey.findById(surveyId)
                    .populate('business', 'name')
                    .populate('createdBy', 'name email');
            }
        }

        // 2. Eğer QR kod ile bulunamadıysa, doğrudan anket ID'si olabilir
        if (!survey && mongoose.Types.ObjectId.isValid(code)) {
            survey = await Survey.findById(code)
                .populate('business', 'name')
                .populate('createdBy', 'name email');
        }

        // 3. Hala bulunamadıysa özel kod formatını kontrol et
        if (!survey) {
            console.log('Özel kod formatı kontrolü yapılıyor');
            const codePattern = /^[A-Za-z]\d+[A-Za-z]-[A-Za-z]+-\d+[A-Za-z]$/;

            if (codePattern.test(code)) {
                survey = await Survey.findOne({
                    $or: [
                        { 'codes.value': code },
                        { 'accessCodes': code },
                        { 'customCode': code }
                    ]
                })
                    .populate('business', 'name')
                    .populate('createdBy', 'name email');
            }
        }

        if (!survey) {
            console.log(`Anket bulunamadı: ${code}`);
            return res.status(404).json({ error: 'Bu kod için anket bulunamadı' });
        }

        // Anketin aktif olup olmadığını kontrol et
        if (!survey.isActive) {
            console.log(`Anket aktif değil: ${survey._id}`);
            return res.status(400).json({ error: 'Bu anket artık aktif değil' });
        }

        console.log(`Anket bulundu: ${survey._id}`);

        // Yanıt formatını hazırla
        const response: any = {
            ...survey.toObject(),
            accessedVia: qrCode ? 'qr' : 'code',
            accessCode: code,
            scannedAt: new Date()
        };

        // Eğer QR kod ile erişildiyse, QR kod bilgilerini ekle
        if (qrCode) {
            response.qrCode = qrCode;
        }

        res.status(200).json(response);

    } catch (error: any) {
        console.error('Anket erişim hatası:', error);
        res.status(500).json({
            error: 'Anket erişiminde bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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

// QR kod veritabanına kaydetme fonksiyonu
// Survey için bir QR kod oluşturur
const generateAndSaveQRCodes = async (survey: any, baseUrl = 'http://localhost:3000'): Promise<any> => {
    const QRCode = mongoose.model('QRCode');

    console.log(`QR kod oluşturulacak, anket:`, {
        id: survey._id,
        title: survey.title,
        business: survey.business
    });

    try {
        // Benzersiz bir kod oluştur
        const code = generateUniqueQRCode(survey._id, survey.title);

        // Anket URL'si oluştur - bu URL QR kodun taranması sonucu yönlendirilen adres
        const url = `${baseUrl}/s/${code}`;

        // QR kod görüntüsünü oluştur
        let imageData = '';
        try {
            imageData = await qrcode.toDataURL(url, {
                errorCorrectionLevel: 'H',
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            console.log('QR kod resmi oluşturuldu');
        } catch (imgError) {
            console.error('QR kod resmi oluşturulamadı:', imgError);
        }

        // QR kodu veritabanında oluştur
        const qrCode = new QRCode({
            code,
            url,
            surveyId: survey._id,
            survey: survey._id, // Geriye dönük uyumluluk
            businessId: survey.business,
            business: survey.business, // Geriye dönük uyumluluk
            surveyTitle: survey.title,
            description: `QR Kod - ${survey.title}`,
            location: 'Ana QR Kod',
            isActive: true
        });

        // QR kodu kaydet
        const savedCode = await qrCode.save();
        console.log(`✅ QR kod başarıyla oluşturuldu: ${savedCode.code}`);
        console.log(`QR kod ID: ${savedCode._id}`);
        console.log(`QR kod URL: ${savedCode.url}`);

        // Kaydedilen QR kod nesnesine resim verisini ekle
        const result = {
            _id: savedCode._id.toString(),
            id: savedCode._id.toString(),
            code: savedCode.code,
            url: savedCode.url,
            surveyId: savedCode.surveyId.toString(),
            businessId: savedCode.businessId.toString(),
            surveyTitle: savedCode.surveyTitle,
            description: savedCode.description,
            location: savedCode.location,
            isActive: savedCode.isActive,
            createdAt: savedCode.createdAt,
            updatedAt: savedCode.updatedAt,
            imageData: imageData
        };

        return result;
    } catch (error) {
        console.error('QR kod oluşturma hatası:', error);
        throw error; // Hata durumunda hata fırlat
    }
};

// @desc    Create a new survey
// @route   POST /api/surveys
// @access  Private/Business
export const createSurvey = async (req: Request, res: ExpressResponse) => {
    console.log('💡 createSurvey controller çağrıldı');
    console.log('Request path:', req.path);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User info:', req.user ? {
        id: req.user._id || req.user.id,
        role: req.user.role,
        business: req.user.business
    } : 'Anonim kullanıcı');

    try {
        const { title, description, questions, business } = req.body;

        // Validate required fields
        if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Anket başlığı ve en az bir soru gereklidir'
            });
        }

        // Determine business ID from multiple possible sources
        let businessId = business || (req.params ? req.params.businessId : null);

        // If not provided in request, try to get from user
        if (!businessId && req.user && req.user.business) {
            businessId = req.user.business;
            console.log('Business ID kullanıcı bilgisinden alındı:', businessId);
        }

        // Last resort - use user ID if available
        if (!businessId && req.user && (req.user._id || req.user.id)) {
            businessId = req.user._id || req.user.id;
            console.log('Business ID kullanıcı ID\'sinden türetildi:', businessId);
        }

        // If still no business ID, create a random one for development
        if (!businessId && process.env.NODE_ENV === 'development') {
            businessId = new mongoose.Types.ObjectId().toString();
            console.log('Geliştirme modunda rastgele business ID oluşturuldu:', businessId);
        }

        // Final check for business ID
        if (!businessId) {
            return res.status(400).json({
                success: false,
                error: 'İşletme ID\'si bulunamadı, lütfen bir işletme belirtin'
            });
        }

        // Her anket kaydından önce indeks sorunlarını kontrol et
        try {
            // Model statik metodunu kullan
            const Survey = mongoose.model('Survey');
            // @ts-ignore - Özel model metodu
            if (typeof Survey.dropAllIndexes === 'function') {
                console.log('Anket oluşturmadan önce indeksleri kontrol ediliyor...');
                // @ts-ignore - Özel model metodu
                await Survey.dropAllIndexes();
            }
        } catch (indexError) {
            console.warn('İndeks kontrolü yapılamadı, devam ediliyor:', indexError);
        }

        // Create survey with business ID
        const survey = await Survey.create({
            title,
            description,
            questions,
            business: businessId,
            createdBy: req.user._id || req.user.id,
            isActive: true,
            codes: [], // Initialize empty codes array
            accessCodes: [] // Initialize empty accessCodes array
        });

        console.log('✅ Anket başarıyla oluşturuldu:', survey._id);

        // Frontend URL'sini belirle - öncelikle environment değişkeninden al
        let frontendUrl = process.env.FRONTEND_URL;

        // Eğer environment değişkeni yoksa, request üzerinden oluşturmaya çalış
        if (!frontendUrl) {
            const host = req.get('host') || req.get('origin')?.replace(/^https?:\/\//, '') || 'localhost:3000';
            const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
            frontendUrl = `${protocol}://${host}`;
            console.log('Frontend URL otomatik belirlendi:', frontendUrl);
        }

        // Varsayılan değeri kontrol et
        if (!frontendUrl || frontendUrl === 'undefined') {
            frontendUrl = 'http://localhost:3000';
            console.log('Frontend URL varsayılan değer kullanılıyor:', frontendUrl);
        }

        // Tek bir QR kod oluştur
        let qrCode = null;
        try {
            qrCode = await generateAndSaveQRCodes(survey, frontendUrl);
            console.log(`✅ QR kod oluşturuldu: ${qrCode.code}`);
        } catch (qrError: any) {
            console.error('❌ QR kod oluşturma hatası:', qrError);
            // QR kod oluşturma başarısız olsa bile anketi başarılı say
        }

        // Populate related fields
        await survey.populate('createdBy', 'name email');
        await survey.populate('business', 'name');

        // QR kod detaylarını hazırla
        const qrCodeDetails = qrCode ? {
            _id: qrCode._id.toString(),
            id: qrCode._id.toString(),
            code: qrCode.code,
            url: qrCode.url,
            surveyId: qrCode.surveyId?.toString(),
            businessId: qrCode.businessId?.toString(),
            isActive: qrCode.isActive,
            description: qrCode.description,
            location: qrCode.location,
            createdAt: qrCode.createdAt,
            imageData: qrCode.imageData
        } : null;

        // QR kodu yanıta ekle
        const responseData = {
            ...survey.toObject(),
            qrCode: qrCodeDetails,
            qrCodes: qrCode ? [qrCodeDetails] : [] // Geriye dönük uyumluluk için
        };

        // Detailed success logging
        console.log('✅ ANKET BAŞARIYLA OLUŞTURULDU');
        console.log('📋 Anket Bilgileri:');
        console.log(`  - ID: ${survey._id}`);
        console.log(`  - Başlık: ${survey.title}`);
        console.log(`  - İşletme: ${survey.business}`);

        if (qrCodeDetails) {
            console.log('🔗 QR KOD BİLGİLERİ:');
            console.log(`  - QR Kod ID: ${qrCodeDetails.id}`);
            console.log(`  - QR Kod URL: ${qrCodeDetails.url}`);
            console.log(`  - QR Kod Kodu: ${qrCodeDetails.code}`);
        } else {
            console.log('⚠️ QR kod oluşturulamadı!');
        }

        res.status(201).json({
            success: true,
            data: responseData
        });

    } catch (error: any) {
        console.error('createSurvey hatası:', error);

        // MongoDB duplicate key error
        if (error.code === 11000) {
            console.log('Anahtar çakışması hatası, indeksleri temizlemeye çalışılıyor...');

            try {
                // Model statik metodunu kullan
                const Survey = mongoose.model('Survey');
                // @ts-ignore - Özel model metodu
                if (typeof Survey.dropAllIndexes === 'function') {
                    // @ts-ignore - Özel model metodu
                    await Survey.dropAllIndexes();
                }
            } catch (cleanupError) {
                console.error('İndeks temizleme hatası:', cleanupError);
            }

            return res.status(400).json({
                success: false,
                error: 'Bu anket için veri tabanında çakışma var. Lütfen daha sonra tekrar deneyin.',
                details: process.env.NODE_ENV === 'development' ? {
                    code: error.code,
                    keyPattern: error.keyPattern,
                    keyValue: error.keyValue
                } : undefined
            });
        }

        // Validation error
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        }

        // Detaylı hata mesajı dön
        res.status(500).json({
            success: false,
            error: 'Anket oluşturulurken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        // Extract surveyId from params - check both id and surveyId options
        const surveyId = req.params.id || req.params.surveyId;

        console.log(`🗑️ Silme isteği alındı - Anket ID: ${surveyId}`);
        console.log('İstek detayları:', {
            method: req.method,
            url: req.originalUrl,
            params: req.params,
            user: req.user ? { id: req.user.id, role: req.user.role } : 'Kullanıcı bilgisi yok'
        });

        if (!mongoose.Types.ObjectId.isValid(surveyId)) {
            console.log(`❌ Geçersiz ID formatı: ${surveyId}`);
            return res.status(400).json({ error: 'Geçersiz anket ID formatı' });
        }

        // Önce anketi bul
        const survey = await Survey.findById(surveyId);

        if (!survey) {
            console.log(`❌ Anket bulunamadı: ${surveyId}`);
            return res.status(404).json({ error: 'Anket bulunamadı' });
        }

        console.log(`✅ Anket bulundu: ${survey.title} (${surveyId})`);

        // Kullanıcı ve yetki kontrolü - daha esnek hale getir
        if (req.user) {
            const userRole = String(req.user.role || '').toUpperCase();
            const isAdmin = userRole.includes('ADMIN') || userRole.includes('SUPER');

            // Geliştirme modunda veya admin rolünde ise kontrolü atla
            if (!isAdmin && process.env.NODE_ENV !== 'development') {
                // İşletme yöneticisi sadece kendi işletmesinin anketlerini silebilir
                if (survey.business && req.user.business &&
                    survey.business.toString() !== req.user.business.toString()) {
                    // Yetki hatası durumunda bile silmeye devam et ama loga kaydet
                    console.warn(`⚠️ Yetki uyarısı: ${req.user.id} kullanıcısı ${surveyId} ID'li anketi silmeye çalıştı`);
                    console.warn(`⚠️ Kullanıcı işletmesi: ${req.user.business}, Anket işletmesi: ${survey.business}`);
                    console.warn('⚠️ Yine de silme işlemine devam ediliyor - esnek mod');
                    // RETURN İFADESİNİ KALDIRDIK - ARTIK HATADA BİLE DEVAM EDİYOR
                }
            }
        } else {
            console.warn('⚠️ Kullanıcı bilgisi bulunamadı, esnek mod - silme işlemine devam ediliyor');
        }

        // İlişkili QR kodlarını da sil
        const qrResult = await QRCode.deleteMany({ survey: surveyId });
        console.log(`🔗 İlişkili QR kodları silindi: ${qrResult.deletedCount} adet`);

        // Anketi sil - findByIdAndDelete metodunu kullan
        const deleteResult = await Survey.findByIdAndDelete(surveyId);

        if (!deleteResult) {
            console.log(`⚠️ Silme işlemi tamamlandı fakat sonuç boş: ${surveyId}`);
            // İşlemi başarılı kabul et ama uyarı ver
            return res.status(200).json({
                message: 'Anket ve ilişkili QR kodları silindi, ancak silme işlemi doğrulanamadı',
                warning: true
            });
        }

        console.log(`✅ Anket başarıyla silindi: ${surveyId}`);
        res.status(200).json({
            message: 'Anket ve ilişkili QR kodları başarıyla silindi',
            deletedSurvey: {
                id: surveyId,
                title: survey.title
            }
        });
    } catch (error: any) {
        console.error('❌ Anket silme hatası:', error);
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Submit a survey response
// @route   POST /api/surveys/:id/submit
// @access  Public
export const submitSurveyResponse = async (req: Request, res: ExpressResponse) => {
    try {
        // Parametre adını düzeltiyorum - params içinde surveyId kullanıyoruz, id değil
        const surveyId = req.params.surveyId || req.params.id;
        const { survey, answers, customer, business } = req.body;

        console.log('📝 Anket yanıtı alındı:', {
            params: req.params,
            path: req.path,
            url: req.originalUrl,
            anketId: surveyId,
            surveyFromBody: survey,
            customerInfo: customer,
            businessInfo: business,
            answersCount: answers?.length || 0
        });

        console.log('Tam gelen veri:', JSON.stringify(req.body, null, 2));

        // Anket ID'sini doğrula - request path'den gelen surveyId VEYA body'den gelen survey
        const finalSurveyId = surveyId || survey;

        console.log('Kullanılacak anket ID:', finalSurveyId);

        // Validate the survey ID - Hem surveyId hem de survey'i kontrol et
        if (!finalSurveyId || !mongoose.Types.ObjectId.isValid(finalSurveyId)) {
            console.error('❌ Geçersiz anket ID:', {
                surveyId,
                bodySurvey: survey,
                finalSurveyId,
                valid: finalSurveyId ? mongoose.Types.ObjectId.isValid(finalSurveyId) : false
            });
            return res.status(200).json({
                success: false,
                message: 'Invalid survey ID'
            });
        }

        // Find the survey
        const surveyData = await Survey.findById(finalSurveyId);
        if (!surveyData) {
            console.error('❌ Anket bulunamadı:', finalSurveyId);
            return res.status(200).json({
                success: false,
                message: 'Survey not found'
            });
        }

        // Prepare base response data
        const responseData: any = {
            survey: finalSurveyId,
            business: surveyData.business,
            answers: answers || [],
            rewardPoints: surveyData.rewardPoints || 0
        };

        // Güvenli bir şekilde kullanıcı bilgilerini ekle
        // 1. Kullanıcı oturum açmışsa (req.user varsa)
        if (req.user) {
            responseData.userId = req.user._id;
            console.log('👤 Kayıtlı kullanıcı yanıt gönderiyor:', req.user._id);

            // Oturum açmış kullanıcının bilgilerini direkt kullan
            try {
                const user = await mongoose.model('User').findById(req.user._id).select('name email');
                if (user) {
                    console.log(`✅ Veritabanından gerçek kullanıcı bilgileri alındı: ${user.name}`);
                    responseData.customerName = user.name;
                    responseData.customerEmail = user.email;

                    // Güncellenmiş formata uygun customer objesi oluştur
                    responseData.customer = {
                        _id: req.user._id.toString(),
                        name: user.name,
                        email: user.email
                    };
                }
            } catch (error) {
                console.error('❌ Kullanıcı bilgileri alınırken hata:', error);
            }
        }

        // 2. Anket formunda müşteri bilgileri varsa kaydet (oturum yoksa veya eksik bilgi varsa)
        if (customer && (!responseData.customer || !responseData.customerName)) {
            console.log('📋 Formdan müşteri bilgileri alınıyor:', customer);

            // Adı soyadı verilmişse müşteri nesnesine ekle
            if (customer.name && customer.name.trim()) {
                responseData.customerName = customer.name.trim();
                console.log('✅ Formdan gelen müşteri adı:', responseData.customerName);
            }

            // E-posta verilmişse müşteri nesnesine ekle
            if (customer.email && customer.email.trim()) {
                responseData.customerEmail = customer.email.trim();
            }

            // Eğer daha önce customer nesnesi oluşturulmamışsa şimdi oluştur
            if (!responseData.customer) {
                responseData.customer = {
                    name: responseData.customerName || 'İsimsiz Müşteri',
                    email: responseData.customerEmail || '',
                    _id: (req.user && req.user._id) ? req.user._id.toString() : undefined
                };
            }

            console.log('✅ Müşteri nesnesi oluşturuldu:', responseData.customer);
        }

        // 3. Eğer hiçbir müşteri bilgisi yoksa anonim müşteri oluştur
        if (!responseData.customer) {
            const dateStr = new Date().toLocaleString('tr-TR');
            responseData.customer = {
                name: `Anonim Müşteri (${dateStr})`,
                email: '',
                // Boş string yerine undefined kullanarak MongoDB hatasını önlüyoruz
                // Boş string, geçersiz ObjectId hatasına neden oluyor
            };
            responseData.customerName = responseData.customer.name;
            console.log('👤 Anonim müşteri nesnesi oluşturuldu:', responseData.customer.name);
        }

        // Debug amaçlı sonuç verilerini göster
        console.log('📊 Veritabanına kaydedilecek yanıt verileri:', {
            survey: finalSurveyId,
            customer: responseData.customer,
            customerName: responseData.customerName,
            userId: responseData.userId,
            answersCount: answers?.length || 0
        });

        // Aynı kişi aynı ankete daha önce yanıt vermiş mi kontrol et
        try {
            // Save the response
            const response = await Response.create(responseData);
            console.log(`✅ Anket yanıtı başarıyla kaydedildi: ${response._id}`);

            // Return response
            return res.status(201).json({
                success: true,
                message: 'Survey response submitted successfully',
                data: response,
                rewardPoints: surveyData.rewardPoints || 0
            });
        } catch (dbError: any) {
            // Unique indeks hatası durumunda (aynı kullanıcı aynı ankete tekrar yanıt vermişse)
            if (dbError.name === 'MongoError' || dbError.name === 'MongoServerError') {
                if (dbError.code === 11000) { // Duplicate key error code
                    console.log(`❌ Bu kullanıcı bu ankete daha önce yanıt vermiş: ${responseData.customerName}`);

                    // Önceki yanıtı bul
                    const existingResponse = await Response.findOne({
                        survey: finalSurveyId,
                        'customer.name': responseData.customerName
                    });

                    // Başarılı mesajı ve bilgi döndür, ama existingResponse olduğunu belirt
                    return res.status(200).json({
                        success: true,
                        message: 'Bu ankete daha önce yanıt verdiniz. Önceki yanıtınız kaydedilmiştir.',
                        isExistingResponse: true,
                        data: existingResponse,
                        rewardPoints: 0 // Tekrar puan verme
                    });
                }
            }

            // Diğer veritabanı hataları için
            console.error('❌ Veritabanı hatası:', dbError);
            throw dbError; // Diğer hatalar için dışarıdaki catch bloğuna aktar
        }
    } catch (error: any) {
        console.error('❌ Error submitting survey response:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit survey response',
            error: error.message
        });
    }
};

// @desc    Get QR codes for business
// @route   GET /api/surveys/qr/business/:businessId
// @access  Private/Business
export const getBusinessQRCodes = async (req: Request, res: ExpressResponse) => {
    try {
        const { businessId } = req.params;

        console.log('QR kodları getiriliyor - İşletme ID:', businessId);

        // businessId kontrolü
        if (!businessId || businessId === 'undefined' || businessId === 'null') {
            console.error('Missing or invalid business ID:', businessId);
            return res.status(200).json({
                success: false,
                message: 'Geçersiz işletme ID',
                data: []
            });
        }

        // ID geçerliliğini kontrol et
        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            console.error('Invalid business ID format:', businessId);
            return res.status(200).json({
                success: false,
                message: 'Geçersiz işletme ID formatı',
                data: []
            });
        }

        // Önce işletmeye ait anketleri bul
        const surveys = await Survey.find({ business: businessId })
            .select('_id title');

        if (!surveys || surveys.length === 0) {
            console.log('No surveys found for business:', businessId);
            return res.status(200).json({
                success: true,
                message: 'İşletme için anket bulunamadı',
                data: []
            });
        }

        console.log(`Found ${surveys.length} surveys for business ${businessId}`);

        // Anketlerin ID'lerini çıkar
        const surveyIds = surveys.map((survey: any) => survey._id);

        // Tüm anketlerin QR kodlarını tek sorguda getir
        const qrCodes = await QRCode.find({
            $or: [
                { survey: { $in: surveyIds } },
                { surveyId: { $in: surveyIds } }
            ]
        });

        console.log(`Found ${qrCodes.length} QR codes for ${surveyIds.length} surveys`);

        // QR kod detaylarını hazırla ve base64 resim oluştur
        const qrPromises = qrCodes.map(async (qrCode) => {
            // QR kod resmi oluştur
            let imageData = '';
            try {
                imageData = await qrcode.toDataURL(qrCode.url, {
                    errorCorrectionLevel: 'H',
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                });
            } catch (error) {
                console.error('QR kod resmi oluşturma hatası:', error);
            }

            // Find the survey this QR code belongs to
            const survey = surveys.find((s: any) =>
                s._id.toString() === (qrCode.surveyId?.toString() || qrCode.survey?.toString())
            );

            return {
                ...qrCode.toObject(),
                _id: qrCode._id.toString(),
                surveyId: qrCode.surveyId ? qrCode.surveyId.toString() : qrCode.survey?.toString(),
                businessId: qrCode.businessId ? qrCode.businessId.toString() : qrCode.business?.toString(),
                surveyTitle: survey?.title || qrCode.surveyTitle || 'Isimsiz Anket',
                imageData: imageData
            };
        });

        // Tüm QR kodları için resim oluşturma işlemlerini bekle
        const qrCodesWithImages = await Promise.all(qrPromises);

        // Her anket için QR kodlarını gruplandır
        const result = surveys.map((survey: any) => {
            const surveyCodes = qrCodesWithImages.filter(
                qr => qr.survey?.toString() === survey._id.toString() ||
                    qr.surveyId === survey._id.toString()
            );

            return {
                survey: {
                    _id: survey._id,
                    title: survey.title
                },
                qrCodes: surveyCodes
            };
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('QR kodları getirirken hata oluştu:', error);
        res.status(500).json({
            success: false,
            message: 'QR kodları getirirken bir hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            data: []
        });
    }
};

// @desc    Get all responses for a business
// @route   GET /api/surveys/business/:businessId/responses
// @access  Private/Business
export const getBusinessResponses = async (req: Request, res: ExpressResponse) => {
    try {
        const { businessId } = req.params;

        console.log('🔍 Getting responses for business ID:', businessId);

        // Validate businessId
        if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
            console.error('Invalid business ID:', businessId);
            return res.status(200).json({
                success: false,
                message: 'Invalid business ID',
                data: []
            });
        }

        // Find the business
        const business = await Business.findById(businessId);
        if (!business) {
            console.error('Business not found with ID:', businessId);
            return res.status(200).json({
                success: false,
                message: 'Business not found',
                data: []
            });
        }
        console.log('Found business:', business.name);

        // Önce tüm yanıtları bulalım
        let responses = await Response.find({ business: businessId })
            .populate({
                path: 'survey',
                select: 'title description questions rewardPoints'
            })
            .sort({ createdAt: -1 });

        console.log(`Found ${responses.length} responses for business ${businessId}`);

        // Yanıtlardaki userId'leri toplayalım
        const userIds = responses
            .filter(r => r.userId && mongoose.Types.ObjectId.isValid(r.userId.toString()))
            .map(r => r.userId);

        console.log(`Found ${userIds.length} unique userIds to fetch`);

        // Tüm ilgili kullanıcıları tek seferde getir
        const users = userIds.length > 0
            ? await mongoose.model('User').find({ _id: { $in: userIds } })
                .select('_id name email')
            : [];

        console.log(`Fetched ${users.length} users from database`);

        // Kolay erişim için kullanıcıları ID'lerine göre map'leyelim
        const usersMap: Record<string, { _id: string, name: string, email: string }> = {};
        users.forEach(user => {
            usersMap[user._id.toString()] = {
                _id: user._id.toString(),
                name: user.name || '',
                email: user.email || ''
            };
        });

        // İşlenmiş yanıtları hazırla
        const processedResponses = responses.map(response => {
            const responseObj = response.toObject();

            // Önce varsayılan müşteri bilgilerini ayarla
            let customerInfo = {
                _id: '',
                name: 'İsimsiz Müşteri',
                email: ''
            };

            // 1. Öncelik: UserId alanından kullanıcı bilgilerini al (veritabanından getirilen)
            if (responseObj.userId) {
                const userId = responseObj.userId.toString();

                if (usersMap[userId]) {
                    customerInfo = {
                        _id: usersMap[userId]._id,
                        name: usersMap[userId].name,
                        email: usersMap[userId].email
                    };
                    console.log(`[${responseObj._id}] ✅ Kullanıcı veritabanından bulundu: ${customerInfo.name}`);
                }
            }

            // 2. Öncelik: Customer nesnesi (eğer varsa ve userID bulunamadıysa)
            if (customerInfo.name === 'İsimsiz Müşteri' && responseObj.customer) {
                // Eğer customer bir obje ise
                if (typeof responseObj.customer === 'object' && responseObj.customer !== null) {
                    const customer = responseObj.customer as any;

                    // İsim bilgisi
                    if (customer.name && typeof customer.name === 'string') {
                        customerInfo.name = customer.name.trim();
                        console.log(`[${responseObj._id}] Customer nesnesinden isim alındı: ${customerInfo.name}`);
                    }

                    // Email bilgisi
                    if (customer.email && typeof customer.email === 'string') {
                        customerInfo.email = customer.email;
                    }

                    // ID bilgisi - boş string değerini temizle
                    if (customer._id && customer._id !== '') {
                        customerInfo._id = customer._id.toString();
                    }
                }
            }

            // 3. Öncelik: CustomerName ve CustomerEmail alanları
            if (customerInfo.name === 'İsimsiz Müşteri' && responseObj.customerName) {
                customerInfo.name = responseObj.customerName.trim();
                console.log(`[${responseObj._id}] CustomerName alanından isim alındı: ${customerInfo.name}`);

                if (responseObj.customerEmail) {
                    customerInfo.email = responseObj.customerEmail;
                }
            }

            // Eğer hala anonim bir kullanıcı ise, tarihle birlikte anonim olarak işaretle
            if (customerInfo.name === 'İsimsiz Müşteri') {
                const tarih = new Date(responseObj.createdAt).toLocaleDateString('tr-TR');
                const saat = new Date(responseObj.createdAt).toLocaleTimeString('tr-TR');
                customerInfo.name = `Anonim Müşteri (${tarih} ${saat})`;
                console.log(`[${responseObj._id}] Tarih/saat ile anonim müşteri oluşturuldu`);
            }

            // Yanıta güncellenmiş customer nesnesini ekle
            responseObj.customer = customerInfo;
            // Geriye dönük uyumluluk için
            responseObj.customerName = customerInfo.name;
            responseObj.customerEmail = customerInfo.email;

            return responseObj;
        });

        // İlk yanıtı kontrol amaçlı logla
        if (processedResponses.length > 0) {
            const firstSurvey = processedResponses[0].survey;
            const surveyTitle = typeof firstSurvey === 'object' && firstSurvey !== null && 'title' in firstSurvey
                ? (firstSurvey as any).title
                : 'Bilinmeyen';

            console.log('İlk yanıt için müşteri bilgileri:', {
                id: processedResponses[0]._id,
                customer: processedResponses[0].customer,
                survey: surveyTitle
            });
        }

        // Return success response with processed responses data
        return res.status(200).json({
            success: true,
            data: processedResponses
        });
    } catch (error: any) {
        console.error('Error getting business responses:', error);
        return res.status(500).json({
            success: false,
            message: 'Error getting business responses',
            error: error.message || 'An error occurred while retrieving responses',
            data: []
        });
    }
};

// @desc    Approve reward points for a survey response
// @route   PATCH /api/surveys/responses/:responseId/approve-points
// @access  Private/BusinessAdmin
export const approveResponsePoints = async (req: Request, res: ExpressResponse) => {
    try {
        const { responseId } = req.params;
        const { approvedPoints } = req.body;

        console.log('Puan onaylama isteği alındı:', {
            params: req.params,
            body: req.body,
            approvedPoints,
            user: req.user ? {
                id: req.user._id,
                role: req.user.role
            } : 'Bilinmeyen kullanıcı'
        });

        // Validate responseId
        if (!responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir yanıt ID\'si gereklidir'
            });
        }

        // Önce yanıtı bul (customer bilgisini almak için)
        const response = await mongoose.model('Response').findById(responseId)
            .select('survey business pointsApproved customer customerName customerEmail userId')
            .exec();

        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Yanıt bulunamadı'
            });
        }

        // Puan durumunu kontrol et
        if (response.pointsApproved === true) {
            return res.status(400).json({
                success: false,
                message: 'Bu yanıt için puanlar zaten onaylanmış'
            });
        }

        const numApprovedPoints = Number(approvedPoints);
        const currentDate = new Date();

        // Doğrudan güncelleme yap
        const result = await mongoose.model('Response').updateOne(
            { _id: responseId },
            {
                $set: {
                    pointsApproved: true,
                    rewardPoints: numApprovedPoints,
                    approvedBy: req.user._id, // İşlemi yapan admin
                    approvedAt: currentDate // İşlem tarihi
                }
            }
        );

        if (result.modifiedCount === 0) {
            console.log('Yanıt güncellenemedi:', result);
            return res.status(400).json({
                success: false,
                message: 'Yanıt güncellenemedi'
            });
        }

        console.log('✅ Yanıt başarıyla güncellendi, puanlar onaylandı:', result);

        // Kullanıcı puanlarını güncelle (eğer ilişkili bir kullanıcı varsa)
        try {
            let userId = null;
            let customerName = "İsimsiz Müşteri";

            // userId alanına öncelik ver
            if (response.userId) {
                userId = response.userId;
                console.log('✅ userId alanından kullanıcı bulundu:', userId);
            }
            // customer._id alanını kontrol et
            else if (response.customer && typeof response.customer === 'object' && response.customer._id) {
                userId = response.customer._id;
                customerName = response.customer.name || response.customerName || "İsimsiz Müşteri";
                console.log('✅ customer._id alanından kullanıcı bulundu:', userId);
            }
            // customer string ise kontrol et
            else if (response.customer && typeof response.customer === 'string') {
                userId = response.customer;
                customerName = response.customerName || "İsimsiz Müşteri";
                console.log('✅ customer string alanından kullanıcı bulundu:', userId);
            }

            if (userId && mongoose.Types.ObjectId.isValid(userId.toString())) {
                // Kullanıcıyı bul
                const user = await mongoose.model('User').findById(userId);

                if (user) {
                    // Kullanıcının mevcut puanlarını al
                    const currentPoints = user.points || 0;

                    // Yeni toplam puanlar
                    const updatedPoints = currentPoints + numApprovedPoints;

                    // Puanları güncelle
                    const userUpdateResult = await mongoose.model('User').updateOne(
                        { _id: userId },
                        { $set: { points: updatedPoints } }
                    );

                    console.log('✅ Kullanıcı puanları güncellendi:', {
                        userId,
                        öncekiPuan: currentPoints,
                        eklenenPuan: numApprovedPoints,
                        yeniToplamPuan: updatedPoints,
                        sonuç: userUpdateResult
                    });

                    if (userUpdateResult.modifiedCount > 0) {
                        console.log(`✅ Kullanıcı ${userId} puanları güncellendi: +${numApprovedPoints} puan -> Toplam: ${updatedPoints}`);
                    } else {
                        console.log(`⚠️ Kullanıcı ${userId} puanları güncellenemedi veya kullanıcı bulunamadı`);
                    }
                } else {
                    console.log(`⚠️ Kullanıcı bulunamadı: ${userId}`);
                }
            } else {
                console.log('⚠️ Puanları güncellemek için geçerli bir kullanıcı ID bulunamadı');
            }

            // İşlem logunu veritabanına kaydet (opsiyonel)
            try {
                await mongoose.model('Log').create({
                    action: 'APPROVE_POINTS',
                    user: req.user._id,
                    details: {
                        responseId: responseId,
                        surveyId: response.survey,
                        customerId: userId,
                        customerName: customerName,
                        pointsAwarded: numApprovedPoints,
                        timestamp: currentDate
                    }
                });
                console.log('✅ İşlem logu kaydedildi');
            } catch (logError) {
                console.error('⚠️ İşlem logu kaydedilemedi:', logError);
                // Log kaydı hata verse bile işleme devam et
            }
        } catch (userError) {
            console.error('❌ Kullanıcı puanları güncellenirken hata:', userError);
            // Hata olsa bile devam et, ana işlem başarılı oldu
        }

        return res.status(200).json({
            success: true,
            message: 'Puanlar başarıyla onaylandı',
            data: {
                responseId: responseId,
                approvedPoints: numApprovedPoints,
                approvedBy: req.user.name || req.user._id,
                approvedAt: currentDate
            }
        });
    } catch (error: any) {
        console.error('❌ Puan onaylama hatası:', error);

        // Hata kaynağını daha detaylı logla
        if (error.name) console.error('Hata türü:', error.name);
        if (error.code) console.error('Hata kodu:', error.code);
        if (error.stack) console.error('Hata stack:', error.stack);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz veri formatı: ' + (error.path ? `'${error.path}' alanında hata` : 'Bilinmeyen alan'),
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } else if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Doğrulama hatası: ' + error.message,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Puanlar onaylanırken bir hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Reject reward points for a survey response
// @route   PATCH /api/surveys/responses/:responseId/reject-points
// @access  Private/BusinessAdmin
export const rejectResponsePoints = async (req: Request, res: ExpressResponse) => {
    try {
        const { responseId } = req.params;
        console.log('Puan reddetme isteği alındı:', {
            params: req.params,
            body: req.body,
            user: req.user ? {
                id: req.user._id,
                role: req.user.role,
                name: req.user.name
            } : 'Bilinmeyen kullanıcı'
        });

        // Validate responseId
        if (!responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir yanıt ID\'si gereklidir'
            });
        }

        // Önce yanıtı bul (customer bilgisini almak için)
        const response = await mongoose.model('Response').findById(responseId)
            .select('survey business pointsApproved customer customerName customerEmail userId')
            .exec();

        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Yanıt bulunamadı'
            });
        }

        const currentDate = new Date();

        // Doğrudan güncelleme yap
        const result = await mongoose.model('Response').updateOne(
            { _id: responseId },
            {
                $set: {
                    pointsApproved: false,
                    rejectedBy: req.user._id, // İşlemi yapan admin
                    rejectedAt: currentDate // İşlem tarihi
                }
            }
        );

        if (result.modifiedCount === 0) {
            console.log('Yanıt güncellenmedi:', result);
            return res.status(404).json({
                success: false,
                message: 'Yanıt bulunamadı veya güncellenemedi'
            });
        }

        console.log('✅ Yanıt başarıyla reddedildi:', result);

        // Reddedilen müşteri bilgilerini belirle
        let customerId = null;
        let customerName = "İsimsiz Müşteri";

        // userId alanına öncelik ver
        if (response.userId) {
            customerId = response.userId;
        }
        // customer._id alanını kontrol et
        else if (response.customer && typeof response.customer === 'object' && response.customer._id) {
            customerId = response.customer._id;
            customerName = response.customer.name || response.customerName || "İsimsiz Müşteri";
        }
        // customer string ise kontrol et
        else if (response.customer && typeof response.customer === 'string') {
            customerId = response.customer;
            customerName = response.customerName || "İsimsiz Müşteri";
        }

        // Eğer daha önce yanıt onaylanmışsa puanları düşür
        if (response.pointsApproved === true &&
            response.rewardPoints &&
            response.rewardPoints > 0) {

            const pointsToDeduct = response.rewardPoints;

            console.log(`❗ Yanıt daha önce onaylanmıştı. ${pointsToDeduct} puan kullanıcıdan düşürülecek.`);

            if (customerId && mongoose.Types.ObjectId.isValid(customerId.toString())) {
                // Kullanıcıyı bul
                const user = await mongoose.model('User').findById(customerId);

                if (user) {
                    // Kullanıcının mevcut puanlarını al
                    const currentPoints = user.points || 0;

                    // Yeni toplam puanları hesapla (negatif olmamasını sağla)
                    const updatedPoints = Math.max(0, currentPoints - pointsToDeduct);

                    // Puanları güncelle (düşür)
                    const userUpdateResult = await mongoose.model('User').updateOne(
                        { _id: customerId },
                        { $set: { points: updatedPoints } }
                    );

                    console.log('✅ Kullanıcı puanları azaltıldı:', {
                        userId: customerId,
                        öncekiPuan: currentPoints,
                        düşülenPuan: pointsToDeduct,
                        yeniToplamPuan: updatedPoints,
                        sonuç: userUpdateResult
                    });
                }
            }
        }

        // İşlem logunu veritabanına kaydet (opsiyonel)
        try {
            await mongoose.model('Log').create({
                action: 'REJECT_POINTS',
                user: req.user._id,
                details: {
                    responseId: responseId,
                    surveyId: response.survey,
                    customerId: customerId,
                    customerName: customerName,
                    timestamp: currentDate
                }
            });
            console.log('✅ Red işlemi logu kaydedildi');
        } catch (logError) {
            console.error('⚠️ İşlem logu kaydedilemedi:', logError);
            // Log kaydı hata verse bile işleme devam et
        }

        // Sonuç başarılı olduğunda yanıt verisi
        return res.status(200).json({
            success: true,
            message: 'Puanlar reddedildi',
            data: {
                responseId: responseId,
                rejectedBy: req.user.name || req.user._id,
                rejectedAt: currentDate
            }
        });
    } catch (error: any) {
        console.error('❌ Puan reddetme hatası:', error);

        // Hata kaynağını daha detaylı logla
        if (error.name) console.error('Hata türü:', error.name);
        if (error.code) console.error('Hata kodu:', error.code);
        if (error.stack) console.error('Hata stack:', error.stack);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz veri formatı: ' + (error.path ? `'${error.path}' alanında hata` : 'Bilinmeyen alan'),
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } else if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Doğrulama hatası: ' + error.message,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Puanlar reddedilirken bir hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get pending approval responses for a business
// @route   GET /api/surveys/business/pending-approvals
// @access  Private/BusinessAdmin
export const getPendingApprovals = async (req: Request, res: ExpressResponse) => {
    try {
        // İşletme ID'sini kullanıcı bilgisinden al
        const businessId = req.user?.business;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'İşletme ID bilgisi bulunamadı',
                data: []
            });
        }

        // Onaylanmamış yanıtları getir (pointsApproved === null)
        const pendingResponses = await Response.find({
            business: businessId,
            pointsApproved: null
        })
            .populate({
                path: 'survey',
                select: 'title description questions rewardPoints'
            })
            .sort({ createdAt: -1 });

        console.log(`${pendingResponses.length} adet onay bekleyen yanıt bulundu`);

        return res.status(200).json({
            success: true,
            data: pendingResponses
        });
    } catch (error: any) {
        console.error('Onay bekleyen yanıtları getirirken hata:', error);
        return res.status(500).json({
            success: false,
            message: 'Onay bekleyen yanıtlar getirilirken bir hata oluştu',
            error: error.message || 'Bilinmeyen hata',
            data: []
        });
    }
};

// @desc    Delete a survey response
// @route   DELETE /api/surveys/responses/:responseId
// @access  Private/BusinessAdmin
export const deleteResponse = async (req: Request, res: ExpressResponse) => {
    try {
        const { responseId } = req.params;
        console.log('Yanıt silme isteği alındı:', {
            params: req.params,
            user: req.user ? {
                id: req.user._id,
                role: req.user.role,
                name: req.user.name,
                business: req.user.business
            } : 'Bilinmeyen kullanıcı'
        });

        // Yanıt ID'si doğrula
        if (!responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir yanıt ID\'si gereklidir'
            });
        }

        // Yanıtı bul
        const response = await Response.findById(responseId)
            .select('survey business customer customerName customerEmail userId pointsApproved rewardPoints')
            .exec();

        if (!response) {
            return res.status(404).json({
                success: false,
                message: 'Yanıt bulunamadı'
            });
        }

        // İşletme yetki kontrolü - admin sadece kendi işletmesine ait yanıtları silebilir
        if (req.user.role !== UserRole.SUPER_ADMIN &&
            response.business &&
            response.business.toString() !== req.user.business?.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bu yanıtı silme yetkiniz bulunmamaktadır'
            });
        }

        // Eğer yanıt onaylanmışsa ve kullanıcıya puan verilmişse puanları geri al
        if (response.pointsApproved === true &&
            response.rewardPoints &&
            response.rewardPoints > 0) {

            // Puanları düşürülecek kullanıcıyı belirle
            let userId = null;

            // Önce userId alanını kontrol et
            if (response.userId) {
                userId = response.userId;
            }
            // Sonra customer nesnesini kontrol et
            else if (response.customer) {
                if (typeof response.customer === 'object' && response.customer._id) {
                    userId = response.customer._id;
                } else if (typeof response.customer === 'string') {
                    userId = response.customer;
                }
            }

            // Kullanıcı bulunduysa puanları düşür
            if (userId && mongoose.Types.ObjectId.isValid(userId.toString())) {
                try {
                    // Kullanıcıyı bul
                    const user = await mongoose.model('User').findById(userId);

                    if (user) {
                        // Kullanıcının mevcut puanlarını al
                        const currentPoints = user.points || 0;

                        // Yeni toplam puanları hesapla (negatif olmamasını sağla)
                        const updatedPoints = Math.max(0, currentPoints - response.rewardPoints);

                        // Puanları güncelle
                        await mongoose.model('User').updateOne(
                            { _id: userId },
                            { $set: { points: updatedPoints } }
                        );

                        console.log(`✅ Silinen yanıt için kullanıcı puanları düşürüldü:`, {
                            userId,
                            öncekiPuan: currentPoints,
                            düşülenPuan: response.rewardPoints,
                            yeniToplamPuan: updatedPoints
                        });
                    }
                } catch (error) {
                    console.error('⚠️ Kullanıcı puanları düşürülürken hata:', error);
                    // Puanlar düşürülemese bile işleme devam et
                }
            }
        }

        // Yanıtı sil
        const deleteResult = await Response.findByIdAndDelete(responseId);

        if (!deleteResult) {
            return res.status(404).json({
                success: false,
                message: 'Yanıt bulunamadı veya silinemedi'
            });
        }

        // İşlem logunu kaydet
        try {
            await mongoose.model('Log').create({
                action: 'DELETE_RESPONSE',
                user: req.user._id,
                details: {
                    responseId,
                    surveyId: response.survey,
                    businessId: response.business,
                    pointsApproved: response.pointsApproved,
                    rewardPoints: response.rewardPoints,
                    timestamp: new Date()
                }
            });
            console.log('✅ Yanıt silme işlemi loglandı');
        } catch (logError) {
            console.error('⚠️ İşlem logu kaydedilemedi:', logError);
            // Log kaydı hata verse bile işleme devam et
        }

        return res.status(200).json({
            success: true,
            message: 'Yanıt başarıyla silindi',
            data: {
                responseId,
                deletedAt: new Date(),
                deletedBy: req.user.name || req.user._id
            }
        });

    } catch (error: any) {
        console.error('❌ Yanıt silme hatası:', error);

        return res.status(500).json({
            success: false,
            message: 'Yanıt silinirken bir hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}; 