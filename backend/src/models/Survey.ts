import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IQuestion {
    text: string;
    type: 'rating' | 'text' | 'multiple_choice';
    options?: string[];
    required: boolean;
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
    createdAt: Date;
    updatedAt: Date;
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
}, { timestamps: true });

export default mongoose.model<ISurvey>('Survey', SurveySchema); 