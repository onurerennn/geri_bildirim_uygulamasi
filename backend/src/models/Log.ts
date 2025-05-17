import mongoose, { Schema, Document } from 'mongoose';

export interface ILog extends Document {
    action: string;           // İşlem tipi (APPROVE_POINTS, REJECT_POINTS, vb.)
    user: mongoose.Types.ObjectId;    // İşlemi yapan kullanıcı/admin
    details: any;             // İşlem detayları (müşteri, puan, tarih, vb.)
    createdAt: Date;
    updatedAt: Date;
}

const LogSchema: Schema = new Schema({
    action: {
        type: String,
        required: true,
        enum: ['APPROVE_POINTS', 'REJECT_POINTS', 'UPDATE_POINTS', 'DELETE_RESPONSE', 'CREATE_USER', 'LOGIN', 'LOGOUT']
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    details: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Performans için indeks ekleme
LogSchema.index({ action: 1, createdAt: -1 });
LogSchema.index({ user: 1, createdAt: -1 });

export const Log = mongoose.model<ILog>('Log', LogSchema);

export default Log; 