import mongoose from 'mongoose';

export interface IReward extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    businessId: mongoose.Types.ObjectId;
    points: number;
    type: 'survey_completion' | 'referral';
    createdAt: Date;
}

const rewardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true,
    },
    points: {
        type: Number,
        required: true,
        min: 0,
    },
    type: {
        type: String,
        enum: ['survey_completion', 'referral'],
        required: true,
    },
}, {
    timestamps: true,
});

export const Reward = mongoose.model<IReward>('Reward', rewardSchema); 