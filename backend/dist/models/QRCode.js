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
const QRCodeSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    url: {
        type: String,
        required: true
    },
    surveyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Survey',
        required: true
    },
    survey: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Survey',
        required: true
    },
    businessId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    business: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    scanCount: {
        type: Number,
        default: 0
    },
    surveyTitle: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    location: {
        type: String,
        default: ''
    }
}, { timestamps: true });
// İndeksler oluştur
QRCodeSchema.index({ code: 1 }, { unique: true });
QRCodeSchema.index({ surveyId: 1 });
QRCodeSchema.index({ businessId: 1 });
// Pre-save middleware to ensure we have both naming conventions filled
QRCodeSchema.pre('save', function (next) {
    // If surveyId is set but survey is not, copy value
    if (this.surveyId && !this.survey) {
        this.survey = this.surveyId;
    }
    // If survey is set but surveyId is not, copy value
    if (this.survey && !this.surveyId) {
        this.surveyId = this.survey;
    }
    // Same for business/businessId
    if (this.businessId && !this.business) {
        this.business = this.businessId;
    }
    if (this.business && !this.businessId) {
        this.businessId = this.business;
    }
    // Ensure at least one of survey or surveyId is set
    if (!this.survey && !this.surveyId) {
        return next(new Error('Either survey or surveyId must be provided'));
    }
    // Ensure at least one of business or businessId is set
    if (!this.business && !this.businessId) {
        return next(new Error('Either business or businessId must be provided'));
    }
    next();
});
exports.default = mongoose_1.default.model('QRCode', QRCodeSchema);
