import mongoose from 'mongoose';

export interface IQuestion {
    type: 'multiple_choice' | 'rating' | 'text';
    text: string;
    options?: string[];
    required: boolean;
}

export interface ISurvey extends mongoose.Document {
    businessId: mongoose.Types.ObjectId;
    title: string;
    questions: IQuestion[];
    startDate: Date;
    endDate: Date;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}

const questionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['multiple_choice', 'rating', 'text'],
        required: true,
    },
    text: {
        type: String,
        required: true,
    },
    options: [{
        type: String,
    }],
    required: {
        type: Boolean,
        default: true,
    },
});

const surveySchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    questions: [questionSchema],
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
}, {
    timestamps: true,
});

export const Survey = mongoose.model<ISurvey>('Survey', surveySchema); 