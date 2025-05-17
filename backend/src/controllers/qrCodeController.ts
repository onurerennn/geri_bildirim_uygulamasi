import { Request, Response } from 'express';
import mongoose from 'mongoose';
import QRCode from '../models/QRCode';
import Survey from '../models/Survey';
import qrcode from 'qrcode';

// Helper function to generate QR code image as base64
const generateQRCodeImage = async (url: string, options = {}): Promise<string> => {
    try {
        // QR kod resmi oluştur
        const qrCodeImage = await qrcode.toDataURL(url, {
            errorCorrectionLevel: 'H',
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            ...options
        });

        return qrCodeImage;
    } catch (error) {
        console.error('QR kod resmi oluşturma hatası:', error);
        return '';
    }
};

// @desc    QR kodlarını anket ID'sine göre getir
// @route   GET /api/qr-codes/survey/:surveyId
// @access  Private
export const getQRCodesBySurvey = async (req: Request, res: Response) => {
    try {
        const { surveyId } = req.params;

        // ID formatını kontrol et
        if (!mongoose.Types.ObjectId.isValid(surveyId)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz anket ID formatı'
            });
        }

        // Anketin var olup olmadığını kontrol et
        const survey = await Survey.findById(surveyId);
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'Anket bulunamadı'
            });
        }

        // QR kodlarını getir
        const qrCodes = await QRCode.find({
            $or: [
                { surveyId: surveyId },
                { survey: surveyId }
            ]
        });

        console.log(`${qrCodes.length} adet QR kod bulundu - Anket ID: ${surveyId}`);

        // Her QR kod için base64 resim oluştur
        const qrCodesWithImages = await Promise.all(
            qrCodes.map(async (qrCode) => {
                const qrCodeObj = qrCode.toObject();
                const qrImage = await generateQRCodeImage(qrCodeObj.url);
                return {
                    ...qrCodeObj,
                    imageData: qrImage
                };
            })
        );

        res.status(200).json({
            success: true,
            count: qrCodesWithImages.length,
            data: qrCodesWithImages
        });
    } catch (error: any) {
        console.error('QR kod getirme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'QR kodları getirilirken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    QR kodlarını işletme ID'sine göre getir
// @route   GET /api/qr-codes/business/:businessId
// @access  Private
export const getQRCodesByBusiness = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;

        // ID formatını kontrol et
        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz işletme ID formatı'
            });
        }

        // QR kodlarını getir
        const qrCodes = await QRCode.find({
            $or: [
                { businessId: businessId },
                { business: businessId }
            ]
        }).sort({ createdAt: -1 });

        console.log(`${qrCodes.length} adet QR kod bulundu - İşletme ID: ${businessId}`);

        // Her QR kod için base64 resim oluştur
        const qrCodesWithImages = await Promise.all(
            qrCodes.map(async (qrCode) => {
                const qrCodeObj = qrCode.toObject();
                const qrImage = await generateQRCodeImage(qrCodeObj.url);
                return {
                    ...qrCodeObj,
                    imageData: qrImage
                };
            })
        );

        // Anket bazında grupla
        const qrCodesByGroup = qrCodesWithImages.reduce((acc: any, qrCode: any) => {
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
    } catch (error: any) {
        console.error('QR kod getirme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'QR kodları getirilirken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Yeni QR kod oluştur
// @route   POST /api/qr-codes
// @access  Private
export const createQRCode = async (req: Request, res: Response) => {
    try {
        const { surveyId, description, location, count = 1 } = req.body;

        // surveyId kontrolü
        if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) {
            return res.status(400).json({
                success: false,
                error: 'Geçerli bir anket ID gereklidir'
            });
        }

        // Anketin var olup olmadığını kontrol et
        const survey = await Survey.findById(surveyId);
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
            const qrCode = new QRCode({
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

            await qrCode.save();

            // QR kod resmi oluştur
            const qrImage = await generateQRCodeImage(url);

            qrCodes.push({
                ...qrCode.toObject(),
                imageData: qrImage
            });
        }

        console.log(`✅ ${qrCodes.length} adet QR kod başarıyla oluşturuldu`);

        res.status(201).json({
            success: true,
            count: qrCodes.length,
            data: qrCodes
        });
    } catch (error: any) {
        console.error('QR kod oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            error: 'QR kod oluşturulurken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    QR kodu güncelle
// @route   PUT /api/qr-codes/:id
// @access  Private
export const updateQRCode = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { description, location, isActive } = req.body;

        // ID formatını kontrol et
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz QR kod ID formatı'
            });
        }

        // QR kodun var olup olmadığını kontrol et
        const qrCode = await QRCode.findById(id);
        if (!qrCode) {
            return res.status(404).json({
                success: false,
                error: 'QR kod bulunamadı'
            });
        }

        // Güncellenecek alanları belirle
        const updates: any = {};
        if (description !== undefined) updates.description = description;
        if (location !== undefined) updates.location = location;
        if (isActive !== undefined) updates.isActive = isActive;

        // QR kodu güncelle
        const updatedQRCode = await QRCode.findByIdAndUpdate(
            id,
            updates,
            { new: true }
        );

        console.log(`✅ QR kod başarıyla güncellendi - ID: ${id}`);

        // QR kod resmi oluştur
        const qrImage = await generateQRCodeImage(updatedQRCode!.url);

        res.status(200).json({
            success: true,
            data: {
                ...updatedQRCode!.toObject(),
                imageData: qrImage
            }
        });
    } catch (error: any) {
        console.error('QR kod güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'QR kod güncellenirken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    QR kodu sil
// @route   DELETE /api/qr-codes/:id
// @access  Private
export const deleteQRCode = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // ID formatını kontrol et
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz QR kod ID formatı'
            });
        }

        // QR kodun var olup olmadığını kontrol et
        const qrCode = await QRCode.findById(id);
        if (!qrCode) {
            return res.status(404).json({
                success: false,
                error: 'QR kod bulunamadı'
            });
        }

        // QR kodu sil
        await QRCode.findByIdAndDelete(id);

        console.log(`✅ QR kod başarıyla silindi - ID: ${id}`);

        res.status(200).json({
            success: true,
            message: 'QR kod başarıyla silindi'
        });
    } catch (error: any) {
        console.error('QR kod silme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'QR kod silinirken bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}; 