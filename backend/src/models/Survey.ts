import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IQuestion {
    text: string;
    type: 'rating' | 'text' | 'multiple_choice';
    options?: string[];
    required: boolean;
}

export interface ICode {
    value: string;
    type: 'qr' | 'custom';
    isActive: boolean;
    createdAt: Date;
}

export interface ISurvey extends Document {
    title: string;
    description: string;
    questions: IQuestion[];
    business: ObjectId;
    isActive: boolean;
    startDate?: Date;
    endDate?: Date;
    createdBy: mongoose.Types.ObjectId;
    rewardPoints: number;
    createdAt: Date;
    updatedAt: Date;
    codes?: ICode[];
    accessCodes?: string[];
    customCode?: string;
}

const QuestionSchema = new Schema({
    text: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ['rating', 'text', 'multiple_choice']
    },
    options: { type: [String], required: false },
    required: { type: Boolean, default: true }
});

const CodeSchema = new Schema({
    value: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['qr', 'custom'],
        default: 'custom'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const SurveySchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    questions: {
        type: [QuestionSchema],
        required: true,
        validate: {
            validator: function (questions: IQuestion[]) {
                return questions.length > 0;
            },
            message: 'A survey must have at least one question'
        }
    },
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    rewardPoints: {
        type: Number,
        default: 0
    },
    codes: {
        type: [CodeSchema],
        default: []
    },
    accessCodes: {
        type: [String],
        default: []
    },
    customCode: {
        type: String,
        sparse: true
    }
}, { timestamps: true });

// Sadece temel indeksleri tanımla - unique indeksleri kaldır
SurveySchema.index({ business: 1 });
SurveySchema.index({ isActive: 1 });

// Bu komutla mevcut indeksleri kaldır ve yeniden yapılandır
// Mongoose modelinde bir metot olarak tanımla
SurveySchema.statics.dropAllIndexes = async function () {
    try {
        await this.collection.dropIndexes();
        console.log('✅ Survey koleksiyonu indeksleri başarıyla temizlendi');

        // Temel indeksleri yeniden oluştur
        await this.collection.createIndex({ business: 1 });
        await this.collection.createIndex({ isActive: 1 });
        console.log('✅ Temel indeksler yeniden oluşturuldu');

        return true;
    } catch (error) {
        console.error('❌ İndeks temizleme işlemi başarısız:', error);
        return false;
    }
};

// Ensure codes can be empty arrays without causing index problems
SurveySchema.path('codes').validate(function (codes: ICode[]) {
    // Allow empty arrays or undefined
    if (!codes || codes.length === 0) return true;

    // Custom code format validation - daha esnek bir format
    const customCodePattern = /^[A-Za-z0-9-]+$/;
    return codes.every(code => {
        if (!code.value) return false;
        if (code.type === 'custom') {
            return customCodePattern.test(code.value);
        }
        return true;
    });
}, 'Geçersiz kod formatı');

// Fix potential pre-save issues with null values
SurveySchema.pre('save', function (next) {
    // @ts-ignore - Mongoose'un DocumentArray tipini uyumlu hale getirmek için
    if (!this.codes) {
        this.set('codes', []);
    }
    // @ts-ignore - Mongoose'un DocumentArray tipini uyumlu hale getirmek için
    if (!this.accessCodes) {
        this.set('accessCodes', []);
    }
    next();
});

export default mongoose.model<ISurvey>('Survey', SurveySchema); 