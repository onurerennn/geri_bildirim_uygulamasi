import mongoose from 'mongoose';

export interface IBusiness extends mongoose.Document {
    name: string;
    adminId: mongoose.Types.ObjectId;
    address: string;
    phone: string;
    qrCodes: string[];
    createdAt: Date;
    updatedAt: Date;
}

const businessSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    address: {
        type: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    qrCodes: [{
        type: String,
    }],
}, {
    timestamps: true,
});

export const Business = mongoose.model<IBusiness>('Business', businessSchema); 