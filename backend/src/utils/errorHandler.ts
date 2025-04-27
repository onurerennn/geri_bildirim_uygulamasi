import { Response } from 'express';

// Hata işleme yardımcı fonksiyonu
export const handleError = (res: Response, error: any): void => {
    console.error('Error:', error);

    // MongoDB hata kodları kontrolü
    if (error.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            message: 'Validasyon hatası',
            errors: error.errors
        });
        return;
    }

    if (error.name === 'CastError') {
        res.status(400).json({
            success: false,
            message: 'Geçersiz ID formatı'
        });
        return;
    }

    if (error.code === 11000) {
        res.status(400).json({
            success: false,
            message: 'Bu kayıt zaten mevcut',
            field: error.keyValue
        });
        return;
    }

    // Genel hata yanıtı
    res.status(500).json({
        success: false,
        message: 'Sunucu hatası oluştu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}; 