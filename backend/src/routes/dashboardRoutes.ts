import express from 'express';
import { protect } from '../middleware/auth';
import User from '../models/User';
import Survey from '../models/Survey';
import Business from '../models/Business';
import { Response } from '../models/Response';

const router = express.Router();

// Tüm admin dashboard istatistikleri
router.get('/admin/dashboard', protect, async (req, res) => {
    try {
        // Veritabanından gerçek verileri çekiyoruz
        // Toplam anket sayısı
        const totalSurveys = await Survey.countDocuments();

        // Aktif anket sayısı
        const activeSurveys = await Survey.countDocuments({ isActive: true });

        // Toplam yanıt sayısı
        const totalResponses = await Response.countDocuments();

        // Toplam kullanıcı sayısı
        const totalUsers = await User.countDocuments();

        // Toplam işletme sayısı
        const totalBusinesses = await Business.countDocuments();

        // İstatistik verilerini oluştur
        const dashboardStats = {
            success: true,
            totalSurveys,
            activeSurveys,
            totalResponses,
            totalUsers,
            totalBusinesses,
            message: "Dashboard istatistikleri başarıyla alındı"
        };

        res.status(200).json(dashboardStats);
    } catch (error) {
        console.error('Dashboard verileri getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Veritabanı sorgulama hatası' });
    }
});

// Dashboard istatistikleri için alternatif endpoint
router.get('/admin/stats', protect, async (req, res) => {
    try {
        // Veritabanından gerçek verileri çekiyoruz
        // Toplam anket sayısı
        const totalSurveys = await Survey.countDocuments();

        // Aktif anket sayısı
        const activeSurveys = await Survey.countDocuments({ isActive: true });

        // Toplam yanıt sayısı
        const totalResponses = await Response.countDocuments();

        // Toplam kullanıcı sayısı
        const totalUsers = await User.countDocuments();

        // Toplam işletme sayısı
        const totalBusinesses = await Business.countDocuments();

        // İstatistik verilerini oluştur
        const dashboardStats = {
            success: true,
            totalSurveys,
            activeSurveys,
            totalResponses,
            totalUsers,
            totalBusinesses,
            message: "Dashboard istatistikleri başarıyla alındı"
        };

        res.status(200).json(dashboardStats);
    } catch (error) {
        console.error('Dashboard istatistikleri getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Veritabanı sorgulama hatası' });
    }
});

// İstatistik verileri için genel endpoint
router.get('/stats', protect, async (req, res) => {
    try {
        // Kullanıcı rolüne göre veri döndür
        const user = req.user as any;
        const isAdmin = user?.role === 'SUPER_ADMIN';

        let query = {};

        // Eğer SUPER_ADMIN değilse, sadece kendi işletmesinin verilerini göster
        if (!isAdmin && user?.business) {
            query = { business: user.business };
        }

        // Veritabanından gerçek verileri çekiyoruz
        // Toplam anket sayısı
        const totalSurveys = await Survey.countDocuments(query);

        // Aktif anket sayısı
        const activeSurveys = await Survey.countDocuments({ ...query, isActive: true });

        // Toplam yanıt sayısı
        const totalResponses = await Response.countDocuments(query);

        // Toplam işletme sayısı (admin için)
        const totalBusinesses = isAdmin ? await Business.countDocuments() : 1;

        // Toplam kullanıcı sayısı (admin için)
        const totalUsers = isAdmin ?
            await User.countDocuments() :
            await User.countDocuments({ business: user?.business });

        // İstatistik verilerini oluştur
        const dashboardStats = {
            success: true,
            totalSurveys,
            activeSurveys,
            totalResponses,
            totalUsers,
            totalBusinesses,
            message: "İstatistikler başarıyla alındı"
        };

        res.status(200).json(dashboardStats);
    } catch (error) {
        console.error('İstatistik getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Veritabanı sorgulama hatası' });
    }
});

// Basit dashboard verisi endpoint
router.get('/dashboard', protect, async (req, res) => {
    try {
        // Kullanıcı rolüne göre veri döndür
        const user = req.user as any;
        const isAdmin = user?.role === 'SUPER_ADMIN';

        let query = {};

        // Eğer SUPER_ADMIN değilse, sadece kendi işletmesinin verilerini göster
        if (!isAdmin && user?.business) {
            query = { business: user.business };
        }

        // Veritabanından gerçek verileri çekiyoruz
        // Toplam anket sayısı
        const totalSurveys = await Survey.countDocuments(query);

        // Aktif anket sayısı
        const activeSurveys = await Survey.countDocuments({ ...query, isActive: true });

        // Toplam yanıt sayısı
        const totalResponses = await Response.countDocuments(query);

        // Toplam işletme sayısı (admin için)
        const totalBusinesses = isAdmin ? await Business.countDocuments() : 1;

        // Toplam kullanıcı sayısı (admin için)
        const totalUsers = isAdmin ?
            await User.countDocuments() :
            await User.countDocuments({ business: user?.business });

        // İstatistik verilerini oluştur
        const dashboardStats = {
            success: true,
            totalSurveys,
            activeSurveys,
            totalResponses,
            totalUsers,
            totalBusinesses,
            message: "Dashboard verileri başarıyla alındı"
        };

        res.status(200).json(dashboardStats);
    } catch (error) {
        console.error('Dashboard verileri getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Veritabanı sorgulama hatası' });
    }
});

export default router; 