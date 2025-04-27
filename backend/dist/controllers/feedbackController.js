"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFeedback = exports.updateFeedback = exports.createFeedback = exports.getFeedback = exports.getFeedbacks = void 0;
const Feedback_1 = __importDefault(require("../models/Feedback"));
const errorHandler_1 = require("../utils/errorHandler");
// Tüm geri bildirimleri getir
const getFeedbacks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const feedbacks = yield Feedback_1.default.find({})
            .populate('business', 'name')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: feedbacks });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
});
exports.getFeedbacks = getFeedbacks;
// Tekil geri bildirim getir
const getFeedback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const feedback = yield Feedback_1.default.findById(req.params.id)
            .populate('business', 'name')
            .populate('user', 'name email');
        if (!feedback) {
            res.status(404).json({ success: false, message: 'Geri bildirim bulunamadı' });
            return;
        }
        res.status(200).json({ success: true, data: feedback });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
});
exports.getFeedback = getFeedback;
// Yeni geri bildirim oluştur
const createFeedback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { business, rating, comment } = req.body;
        // @ts-ignore - User authentication tarafından eklenen özellik
        const userId = req.user.id;
        const feedback = yield Feedback_1.default.create({
            user: userId,
            business,
            rating,
            comment
        });
        res.status(201).json({ success: true, data: feedback });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
});
exports.createFeedback = createFeedback;
// Geri bildirimi güncelle
const updateFeedback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rating, comment } = req.body;
        const feedback = yield Feedback_1.default.findById(req.params.id);
        if (!feedback) {
            res.status(404).json({ success: false, message: 'Geri bildirim bulunamadı' });
            return;
        }
        // @ts-ignore - User authentication tarafından eklenen özellik
        const user = req.user;
        // Business Admin veya Super Admin değilse, sadece kendi geri bildirimlerini güncelleyebilir
        if (!user.isSuperAdmin && !user.isBusinessAdmin && feedback.user.toString() !== user.id) {
            res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz bulunmuyor' });
            return;
        }
        feedback.rating = rating || feedback.rating;
        feedback.comment = comment || feedback.comment;
        yield feedback.save();
        res.status(200).json({ success: true, data: feedback });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
});
exports.updateFeedback = updateFeedback;
// Geri bildirimi sil
const deleteFeedback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const feedback = yield Feedback_1.default.findById(req.params.id);
        if (!feedback) {
            res.status(404).json({ success: false, message: 'Geri bildirim bulunamadı' });
            return;
        }
        // @ts-ignore - User authentication tarafından eklenen özellik
        const user = req.user;
        // Business Admin veya Super Admin değilse, sadece kendi geri bildirimlerini silebilir
        if (!user.isSuperAdmin && !user.isBusinessAdmin && feedback.user.toString() !== user.id) {
            res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz bulunmuyor' });
            return;
        }
        yield feedback.deleteOne();
        res.status(200).json({ success: true, message: 'Geri bildirim başarıyla silindi' });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, error);
    }
});
exports.deleteFeedback = deleteFeedback;
