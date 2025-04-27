import { Request, Response } from 'express';
import Feedback from '../models/Feedback';
import { handleError } from '../utils/errorHandler';

// Tüm geri bildirimleri getir
export const getFeedbacks = async (req: Request, res: Response): Promise<void> => {
    try {
        const feedbacks = await Feedback.find({})
            .populate('business', 'name')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: feedbacks });
    } catch (error) {
        handleError(res, error);
    }
};

// Tekil geri bildirim getir
export const getFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate('business', 'name')
            .populate('user', 'name email');

        if (!feedback) {
            res.status(404).json({ success: false, message: 'Geri bildirim bulunamadı' });
            return;
        }

        res.status(200).json({ success: true, data: feedback });
    } catch (error) {
        handleError(res, error);
    }
};

// Yeni geri bildirim oluştur
export const createFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
        const { business, rating, comment } = req.body;

        // @ts-ignore - User authentication tarafından eklenen özellik
        const userId = req.user.id;

        const feedback = await Feedback.create({
            user: userId,
            business,
            rating,
            comment
        });

        res.status(201).json({ success: true, data: feedback });
    } catch (error) {
        handleError(res, error);
    }
};

// Geri bildirimi güncelle
export const updateFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
        const { rating, comment } = req.body;

        const feedback = await Feedback.findById(req.params.id);

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
        await feedback.save();

        res.status(200).json({ success: true, data: feedback });
    } catch (error) {
        handleError(res, error);
    }
};

// Geri bildirimi sil
export const deleteFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
        const feedback = await Feedback.findById(req.params.id);

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

        await feedback.deleteOne();

        res.status(200).json({ success: true, message: 'Geri bildirim başarıyla silindi' });
    } catch (error) {
        handleError(res, error);
    }
}; 