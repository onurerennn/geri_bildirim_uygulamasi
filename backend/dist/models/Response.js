"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const AnswerSchema = new mongoose_1.Schema({
    question: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Survey.questions',
        required: true
    },
    value: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true
    }
});
const ResponseSchema = new mongoose_1.Schema({
    survey: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Survey',
        required: true
    },
    answers: {
        type: [AnswerSchema],
        required: true,
        validate: {
            validator: function (answers) {
                return answers.length > 0;
            },
            message: 'A response must have at least one answer'
        }
    },
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    business: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    }
}, { timestamps: true });
// Yanıtların benzersiz olmasını sağla (bir kullanıcı bir ankete bir kez yanıt verebilir)
ResponseSchema.index({ survey: 1, customer: 1 }, { unique: true, sparse: true });
exports.default = mongoose_1.default.model('Response', ResponseSchema);
