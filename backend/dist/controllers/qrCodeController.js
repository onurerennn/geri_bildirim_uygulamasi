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
exports.deleteQRCode = exports.updateQRCode = exports.createQRCode = exports.getQRCodesByBusiness = exports.getQRCodesBySurvey = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const QRCode_1 = __importDefault(require("../models/QRCode"));
const Survey_1 = __importDefault(require("../models/Survey"));
const qrcode_1 = __importDefault(require("qrcode"));
// Helper function to generate QR code image as base64
const generateQRCodeImage = (url_1, ...args_1) => __awaiter(void 0, [url_1, ...args_1], void 0, function* (url, options = {}) {
    try {
        // QR kod resmi oluştur
        const qrCodeImage = yield qrcode_1.default.toDataURL(url, Object.assign({ errorCorrectionLevel: 'H', margin: 1, color: {
                dark: '#000000',
                light: '#ffffff'
            } }, options));
        return qrCodeImage;
    }
    catch (error) {
        console.error('QR kod resmi oluşturma hatası:', error);
        return '';
    }
});
// @desc    QR kodlarını anket ID'sine göre getir
// @route   GET /api/qr-codes/survey/:surveyId
// @access  Private
const getQRCodesBySurvey = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { surveyId } = req.params;
        // ID formatını kontrol et
        if (!mongoose_1.default.Types.ObjectId.isValid(surveyId)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz anket ID formatı'
            });
        }
        // Anketin var olup olmadığını kontrol et
        const survey = yield Survey_1.default.findById(surveyId);
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'Anket bulunamadı'
            });
        }
        // QR kodlarını getir
        const qrCodes = yield QRCode_1.default.find({
            $or: [
                { surveyId: surveyId },
                { survey: surveyId }
            ]
        });
        console.log(`${qrCodes.length} adet QR kod bulundu - Anket ID: ${surveyId}`);
        // Her QR kod için base64 resim oluştur
        const qrCodesWithImages = yield Promise.all(qrCodes.map((qrCode) => __awaiter(void 0, void 0, void 0, function* () {
            const qrCodeObj = qrCode.toObject();
            const qrImage = yield generateQRCodeImage(qrCodeObj.url);
            return Object.assign(Object.assign({}, qrCodeObj), { imageData: qrImage });
        })));
        res.status(200).json({
            success: true,
            count: qrCodesWithImages.length,
            data: qrCodesWithImages
        });
    }
    catch (error) {
        console.error('QR kod getirme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'QR kodları getirilirken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
exports.getQRCodesBySurvey = getQRCodesBySurvey;
// @desc    QR kodlarını işletme ID'sine göre getir
// @route   GET /api/qr-codes/business/:businessId
// @access  Private
const getQRCodesByBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { businessId } = req.params;
        // ID formatını kontrol et
        if (!mongoose_1.default.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz işletme ID formatı'
            });
        }
        // QR kodlarını getir
        const qrCodes = yield QRCode_1.default.find({
            $or: [
                { businessId: businessId },
                { business: businessId }
            ]
        }).sort({ createdAt: -1 });
        console.log(`${qrCodes.length} adet QR kod bulundu - İşletme ID: ${businessId}`);
        // Her QR kod için base64 resim oluştur
        const qrCodesWithImages = yield Promise.all(qrCodes.map((qrCode) => __awaiter(void 0, void 0, void 0, function* () {
            const qrCodeObj = qrCode.toObject();
            const qrImage = yield generateQRCodeImage(qrCodeObj.url);
            return Object.assign(Object.assign({}, qrCodeObj), { imageData: qrImage });
        })));
        // Anket bazında grupla
        const qrCodesByGroup = qrCodesWithImages.reduce((acc, qrCode) => {
            const surveyId = qrCode.survey.toString();
            if (!acc[surveyId]) {
                acc[surveyId] = {
                    surveyId,
                    surveyTitle: qrCode.surveyTitle || 'Isimsiz Anket',
                    qrCodes: []
                };
            }
            acc[surveyId].qrCodes.push(qrCode);
            return acc;
        }, {});
        res.status(200).json({
            success: true,
            count: qrCodesWithImages.length,
            data: Object.values(qrCodesByGroup)
        });
    }
    catch (error) {
        console.error('QR kod getirme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'QR kodları getirilirken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
exports.getQRCodesByBusiness = getQRCodesByBusiness;
// @desc    Yeni QR kod oluştur
// @route   POST /api/qr-codes
// @access  Private
const createQRCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { surveyId, description, location, count = 1 } = req.body;
        // surveyId kontrolü
        if (!surveyId || !mongoose_1.default.Types.ObjectId.isValid(surveyId)) {
            return res.status(400).json({
                success: false,
                error: 'Geçerli bir anket ID gereklidir'
            });
        }
        // Anketin var olup olmadığını kontrol et
        const survey = yield Survey_1.default.findById(surveyId);
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'Anket bulunamadı'
            });
        }
        // İsteğin URL'inden veya ortam değişkenlerinden frontend URL'sini belirle
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        // Birden fazla QR kod oluşturma
        const qrCodes = [];
        for (let i = 0; i < count; i++) {
            // Benzersiz bir kod oluştur
            const code = `${survey._id.toString().slice(-6)}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
            // Anket URL'si oluştur
            const url = `${frontendUrl}/s/${code}`;
            // QR kod oluştur
            const qrCode = new QRCode_1.default({
                code,
                url,
                surveyId: survey._id,
                survey: survey._id,
                businessId: survey.business,
                business: survey.business,
                surveyTitle: survey.title,
                description: description || `QR Kod #${i + 1} - ${survey.title}`,
                location: location || '',
                isActive: true
            });
            yield qrCode.save();
            // QR kod resmi oluştur
            const qrImage = yield generateQRCodeImage(url);
            qrCodes.push(Object.assign(Object.assign({}, qrCode.toObject()), { imageData: qrImage }));
        }
        console.log(`✅ ${qrCodes.length} adet QR kod başarıyla oluşturuldu`);
        res.status(201).json({
            success: true,
            count: qrCodes.length,
            data: qrCodes
        });
    }
    catch (error) {
        console.error('QR kod oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            error: 'QR kod oluşturulurken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
exports.createQRCode = createQRCode;
// @desc    QR kodu güncelle
// @route   PUT /api/qr-codes/:id
// @access  Private
const updateQRCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { description, location, isActive } = req.body;
        // ID formatını kontrol et
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz QR kod ID formatı'
            });
        }
        // QR kodun var olup olmadığını kontrol et
        const qrCode = yield QRCode_1.default.findById(id);
        if (!qrCode) {
            return res.status(404).json({
                success: false,
                error: 'QR kod bulunamadı'
            });
        }
        // Güncellenecek alanları belirle
        const updates = {};
        if (description !== undefined)
            updates.description = description;
        if (location !== undefined)
            updates.location = location;
        if (isActive !== undefined)
            updates.isActive = isActive;
        // QR kodu güncelle
        const updatedQRCode = yield QRCode_1.default.findByIdAndUpdate(id, updates, { new: true });
        console.log(`✅ QR kod başarıyla güncellendi - ID: ${id}`);
        // QR kod resmi oluştur
        const qrImage = yield generateQRCodeImage(updatedQRCode.url);
        res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, updatedQRCode.toObject()), { imageData: qrImage })
        });
    }
    catch (error) {
        console.error('QR kod güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'QR kod güncellenirken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
exports.updateQRCode = updateQRCode;
// @desc    QR kodu sil
// @route   DELETE /api/qr-codes/:id
// @access  Private
const deleteQRCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // ID formatını kontrol et
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz QR kod ID formatı'
            });
        }
        // QR kodun var olup olmadığını kontrol et
        const qrCode = yield QRCode_1.default.findById(id);
        if (!qrCode) {
            return res.status(404).json({
                success: false,
                error: 'QR kod bulunamadı'
            });
        }
        // QR kodu sil
        yield QRCode_1.default.findByIdAndDelete(id);
        console.log(`✅ QR kod başarıyla silindi - ID: ${id}`);
        res.status(200).json({
            success: true,
            message: 'QR kod başarıyla silindi'
        });
    }
    catch (error) {
        console.error('QR kod silme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'QR kod silinirken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
exports.deleteQRCode = deleteQRCode;
