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
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const User_1 = __importDefault(require("../models/User"));
const Survey_1 = __importDefault(require("../models/Survey"));
const Business_1 = __importDefault(require("../models/Business"));
const Response_1 = require("../models/Response");
const router = express_1.default.Router();
// Tüm admin dashboard istatistikleri
router.get('/admin/dashboard', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Veritabanından gerçek verileri çekiyoruz
        // Toplam anket sayısı
        const totalSurveys = yield Survey_1.default.countDocuments();
        // Aktif anket sayısı
        const activeSurveys = yield Survey_1.default.countDocuments({ isActive: true });
        // Toplam yanıt sayısı
        const totalResponses = yield Response_1.Response.countDocuments();
        // Toplam kullanıcı sayısı
        const totalUsers = yield User_1.default.countDocuments();
        // Toplam işletme sayısı
        const totalBusinesses = yield Business_1.default.countDocuments();
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
    }
    catch (error) {
        console.error('Dashboard verileri getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Veritabanı sorgulama hatası' });
    }
}));
// Dashboard istatistikleri için alternatif endpoint
router.get('/admin/stats', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Veritabanından gerçek verileri çekiyoruz
        // Toplam anket sayısı
        const totalSurveys = yield Survey_1.default.countDocuments();
        // Aktif anket sayısı
        const activeSurveys = yield Survey_1.default.countDocuments({ isActive: true });
        // Toplam yanıt sayısı
        const totalResponses = yield Response_1.Response.countDocuments();
        // Toplam kullanıcı sayısı
        const totalUsers = yield User_1.default.countDocuments();
        // Toplam işletme sayısı
        const totalBusinesses = yield Business_1.default.countDocuments();
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
    }
    catch (error) {
        console.error('Dashboard istatistikleri getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Veritabanı sorgulama hatası' });
    }
}));
// İstatistik verileri için genel endpoint
router.get('/stats', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Kullanıcı rolüne göre veri döndür
        const user = req.user;
        const isAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'SUPER_ADMIN';
        let query = {};
        // Eğer SUPER_ADMIN değilse, sadece kendi işletmesinin verilerini göster
        if (!isAdmin && (user === null || user === void 0 ? void 0 : user.business)) {
            query = { business: user.business };
        }
        // Veritabanından gerçek verileri çekiyoruz
        // Toplam anket sayısı
        const totalSurveys = yield Survey_1.default.countDocuments(query);
        // Aktif anket sayısı
        const activeSurveys = yield Survey_1.default.countDocuments(Object.assign(Object.assign({}, query), { isActive: true }));
        // Toplam yanıt sayısı
        const totalResponses = yield Response_1.Response.countDocuments(query);
        // Toplam işletme sayısı (admin için)
        const totalBusinesses = isAdmin ? yield Business_1.default.countDocuments() : 1;
        // Toplam kullanıcı sayısı (admin için)
        const totalUsers = isAdmin ?
            yield User_1.default.countDocuments() :
            yield User_1.default.countDocuments({ business: user === null || user === void 0 ? void 0 : user.business });
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
    }
    catch (error) {
        console.error('İstatistik getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Veritabanı sorgulama hatası' });
    }
}));
// Basit dashboard verisi endpoint
router.get('/dashboard', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Kullanıcı rolüne göre veri döndür
        const user = req.user;
        const isAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'SUPER_ADMIN';
        let query = {};
        // Eğer SUPER_ADMIN değilse, sadece kendi işletmesinin verilerini göster
        if (!isAdmin && (user === null || user === void 0 ? void 0 : user.business)) {
            query = { business: user.business };
        }
        // Veritabanından gerçek verileri çekiyoruz
        // Toplam anket sayısı
        const totalSurveys = yield Survey_1.default.countDocuments(query);
        // Aktif anket sayısı
        const activeSurveys = yield Survey_1.default.countDocuments(Object.assign(Object.assign({}, query), { isActive: true }));
        // Toplam yanıt sayısı
        const totalResponses = yield Response_1.Response.countDocuments(query);
        // Toplam işletme sayısı (admin için)
        const totalBusinesses = isAdmin ? yield Business_1.default.countDocuments() : 1;
        // Toplam kullanıcı sayısı (admin için)
        const totalUsers = isAdmin ?
            yield User_1.default.countDocuments() :
            yield User_1.default.countDocuments({ business: user === null || user === void 0 ? void 0 : user.business });
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
    }
    catch (error) {
        console.error('Dashboard verileri getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Veritabanı sorgulama hatası' });
    }
}));
exports.default = router;
