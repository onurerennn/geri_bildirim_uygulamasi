import mongoose, { Schema, Document } from 'mongoose';

export interface IBusiness extends Document {
    name: string;
    address: string;
    phone: string;
    email: string;
    description?: string;
    logo?: string;
    password: string;
    isApproved: boolean;
    isActive: boolean;
    approvedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>(
    {
        name: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: false,
        },
        logo: {
            type: String,
        },
        password: {
            type: String,
            required: true,
        },
        isApproved: {
            type: Boolean,
            default: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<IBusiness>('Business', businessSchema); 