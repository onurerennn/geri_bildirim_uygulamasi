"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reward = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const rewardSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    businessId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
exports.Reward = mongoose_1.default.model('Reward', rewardSchema);
