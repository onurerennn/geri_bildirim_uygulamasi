import mongoose, { Schema, Document } from 'mongoose';
import { ISurvey } from './Survey';
import { IBusiness } from './Business';

export interface IQRCode extends Document {
    code: string;
    surveyId: mongoose.Types.ObjectId;
    survey: mongoose.Types.ObjectId;  // Backward compatibility
    businessId: mongoose.Types.ObjectId;
    business: mongoose.Types.ObjectId;  // Backward compatibility
    url: string;
    isActive: boolean;
    surveyTitle: string;  // Anket başlığı alanı
    createdAt: Date;
    updatedAt: Date;
}

const QRCodeSchema: Schema = new Schema(
    {
        code: {
            type: String,
            required: [true, 'QR code is required'],
            unique: true,
        },
        surveyId: {
            type: Schema.Types.ObjectId,
            ref: 'Survey',
            required: true,
        },
        survey: {
            type: Schema.Types.ObjectId,
            ref: 'Survey',
            required: true,
        },
        businessId: {
            type: Schema.Types.ObjectId,
            ref: 'Business',
            required: true,
        },
        business: {
            type: Schema.Types.ObjectId,
            ref: 'Business',
            required: true,
        },
        url: {
            type: String,
            required: [true, 'URL is required'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        surveyTitle: {
            type: String,
            required: false,
        }
    },
    {
        timestamps: true,
    }
);

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