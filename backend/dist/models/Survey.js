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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const QuestionSchema = new mongoose_1.Schema({
    text: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ['rating', 'text', 'multiple_choice']
    },
    options: { type: [String], required: false },
    required: { type: Boolean, default: true }
});
const CodeSchema = new mongoose_1.Schema({
    value: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['qr', 'custom'],
        default: 'custom'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const SurveySchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    questions: {
        type: [QuestionSchema],
        required: true,
        validate: {
            validator: function (questions) {
                return questions.length > 0;
            },
            message: 'A survey must have at least one question'
        }
    },
    business: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    rewardPoints: {
        type: Number,
        default: 0
    },
    codes: {
        type: [CodeSchema],
        default: []
    },
    accessCodes: {
        type: [String],
        default: []
    },
    customCode: {
        type: String,
        sparse: true
    }
}, { timestamps: true });
// Sadece temel indeksleri tanımla - unique indeksleri kaldır
SurveySchema.index({ business: 1 });
SurveySchema.index({ isActive: 1 });
// Bu komutla mevcut indeksleri kaldır ve yeniden yapılandır
// Mongoose modelinde bir metot olarak tanımla
SurveySchema.statics.dropAllIndexes = function () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield this.collection.dropIndexes();
            console.log('✅ Survey koleksiyonu indeksleri başarıyla temizlendi');
            // Temel indeksleri yeniden oluştur
            yield this.collection.createIndex({ business: 1 });
            yield this.collection.createIndex({ isActive: 1 });
            console.log('✅ Temel indeksler yeniden oluşturuldu');
            return true;
        }
        catch (error) {
            console.error('❌ İndeks temizleme işlemi başarısız:', error);
            return false;
        }
    });
};
// Ensure codes can be empty arrays without causing index problems
SurveySchema.path('codes').validate(function (codes) {
    // Allow empty arrays or undefined
    if (!codes || codes.length === 0)
        return true;
    // Custom code format validation - daha esnek bir format
    const customCodePattern = /^[A-Za-z0-9-]+$/;
    return codes.every(code => {
        if (!code.value)
            return false;
        if (code.type === 'custom') {
            return customCodePattern.test(code.value);
        }
        return true;
    });
}, 'Geçersiz kod formatı');
// Fix potential pre-save issues with null values
SurveySchema.pre('save', function (next) {
    // @ts-ignore - Mongoose'un DocumentArray tipini uyumlu hale getirmek için
    if (!this.codes) {
        this.set('codes', []);
    }
    // @ts-ignore - Mongoose'un DocumentArray tipini uyumlu hale getirmek için
    if (!this.accessCodes) {
        this.set('accessCodes', []);
    }
    next();
});
exports.default = mongoose_1.default.model('Survey', SurveySchema);
