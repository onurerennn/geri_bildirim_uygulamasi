import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IFeedback extends Document {
    user: ObjectId;
    business: ObjectId;
    rating: number;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}

const FeedbackSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    }
}, { timestamps: true });

// Bir kullanıcı bir iş yerine sadece bir kez geri bildirim bırakabilir
FeedbackSchema.index({ user: 1, business: 1 }, { unique: true });

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema); 