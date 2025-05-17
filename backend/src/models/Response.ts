import mongoose, { Schema, Document } from 'mongoose';

export interface IResponse extends Document {
    survey: mongoose.Types.ObjectId;
    business: mongoose.Types.ObjectId;
    customer: mongoose.Types.ObjectId | any; // Müşteri ID'si veya müşteri bilgi nesnesi olabilir
    userId: mongoose.Types.ObjectId; // Response.userId, gönderen kullanıcıyı temsil eder
    customerName?: string; // Müşteri adı
    customerEmail?: string; // Müşteri e-postası
    answers: Array<{
        question: mongoose.Types.ObjectId | string;
        value: string | number;
    }>;
    rewardPoints?: number; // Kazanılan ödül puanları
    pointsApproved?: boolean; // Puan onay durumu
    approvedBy?: mongoose.Types.ObjectId; // Puanları onaylayan kullanıcı
    approvedAt?: Date; // Onay tarihi
    rejectedBy?: mongoose.Types.ObjectId; // Puanları reddeden kullanıcı
    rejectedAt?: Date; // Red tarihi
    createdAt: Date;
    updatedAt: Date;
}

const ResponseSchema: Schema = new Schema({
    survey: {
        type: Schema.Types.ObjectId,
        ref: 'Survey',
        required: true
    },
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    customer: {
        type: Schema.Types.Mixed, // String (ObjectId) veya nesne olabilir
        ref: 'User'
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    customerName: String,
    customerEmail: String,
    answers: [{
        question: {
            type: Schema.Types.Mixed, // String (ObjectId) veya düz metin olabilir
            required: true
        },
        value: {
            type: Schema.Types.Mixed,
            required: true
        }
    }],
    rewardPoints: {
        type: Number,
        default: 0
    },
    pointsApproved: {
        type: Boolean,
        default: null
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date
}, {
    timestamps: true
});

export const Response = mongoose.model<IResponse>('Response', ResponseSchema);

export default Response; 