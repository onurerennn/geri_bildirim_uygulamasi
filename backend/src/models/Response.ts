import mongoose from 'mongoose';

export interface IAnswer {
    questionId: string;
    value: string | number;
}

export interface IResponse extends mongoose.Document {
    surveyId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    answers: IAnswer[];
    sentiment?: {
        score: number;
        magnitude: number;
        labels: string[];
    };
    createdAt: Date;
}

const answerSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true,
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
});

const responseSchema = new mongoose.Schema({
    surveyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Survey',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    answers: [answerSchema],
    sentiment: {
        score: Number,
        magnitude: Number,
        labels: [String],
    },
}, {
    timestamps: true,
});

export const Response = mongoose.model<IResponse>('Response', responseSchema); 