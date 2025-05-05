import mongoose, { Schema, Document } from 'mongoose';
import { ISurvey } from './Survey';
import { IBusiness } from './Business';

export interface IQRCode extends Document {
    code: string;           // Manuel girilebilecek benzersiz kod
    url: string;            // Anket URL'si
    surveyId: mongoose.Types.ObjectId; // Anket ID'si
    survey: mongoose.Types.ObjectId;   // Geriye dönük uyumluluk için
    businessId: mongoose.Types.ObjectId; // İşletme ID'si
    business: mongoose.Types.ObjectId;   // Geriye dönük uyumluluk için
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;      // QR kodun aktif olup olmadığı
    scanCount: number;      // Kaç kez tarandığı
    surveyTitle: string;    // Anket başlığı (kolay referans için)
    description: string;    // QR kodun açıklaması (ör. "Masa 1", "Giriş QR Kodu")
    location: string;       // QR kodun konumunu belirtmek için (opsiyonel)
}

const QRCodeSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    url: {
        type: String,
        required: true
    },
    surveyId: {
        type: Schema.Types.ObjectId,
        ref: 'Survey',
        required: true
    },
    survey: {
        type: Schema.Types.ObjectId,
        ref: 'Survey',
        required: true
    },
    businessId: {
        type: Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    scanCount: {
        type: Number,
        default: 0
    },
    surveyTitle: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    location: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// İndeksler oluştur
QRCodeSchema.index({ code: 1 }, { unique: true });
QRCodeSchema.index({ surveyId: 1 });
QRCodeSchema.index({ businessId: 1 });

// Pre-save middleware to ensure we have both naming conventions filled
QRCodeSchema.pre('save', function (next) {
    // If surveyId is set but survey is not, copy value
    if (this.surveyId && !this.survey) {
        this.survey = this.surveyId;
    }
    // If survey is set but surveyId is not, copy value
    if (this.survey && !this.surveyId) {
        this.surveyId = this.survey;
    }

    // Same for business/businessId
    if (this.businessId && !this.business) {
        this.business = this.businessId;
    }
    if (this.business && !this.businessId) {
        this.businessId = this.business;
    }

    // Ensure at least one of survey or surveyId is set
    if (!this.survey && !this.surveyId) {
        return next(new Error('Either survey or surveyId must be provided'));
    }

    // Ensure at least one of business or businessId is set
    if (!this.business && !this.businessId) {
        return next(new Error('Either business or businessId must be provided'));
    }

    next();
});

export default mongoose.model<IQRCode>('QRCode', QRCodeSchema); 