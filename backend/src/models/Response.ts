import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IAnswer {
    question: ObjectId;
    value: string | number;
}

export interface IResponse extends Document {
    survey: ObjectId;
    answers: IAnswer[];
    customer?: ObjectId;
    business: ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const AnswerSchema = new Schema({
    question: {
        type: Schema.Types.ObjectId,
        ref: 'Survey.questions',
        required: true
    },
    value: {
        type: Schema.Types.Mixed,
        required: true
    }
});

const ResponseSchema = new Schema({
    survey: {
        type: Schema.Types.ObjectId,
        ref: 'Survey',
        required: true
    },
    answers: {
        type: [AnswerSchema],
        required: true,
        validate: {
            validator: function (answers: IAnswer[]) {
                return answers.length > 0;
            },
            message: 'A response must have at least one answer'
        }
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    }
}, { timestamps: true });

// Yanıtların benzersiz olmasını sağla (bir kullanıcı bir ankete bir kez yanıt verebilir)
ResponseSchema.index({ survey: 1, customer: 1 }, { unique: true, sparse: true });

export default mongoose.model<IResponse>('Response', ResponseSchema); 