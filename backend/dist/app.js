"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = __importDefault(require("./config/db"));
// Routes
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const surveyRoutes_1 = __importDefault(require("./routes/surveyRoutes"));
const businessRoutes_1 = __importDefault(require("./routes/businessRoutes"));
dotenv_1.default.config();
exports.app = (0, express_1.default)();
// Connect to MongoDB
(0, db_1.default)();
// CORS manual middleware
exports.app.use((req, res, next) => {
    // İstek kaynağı header'ını al
    const origin = req.headers.origin;
    // İzin verilen origin'leri kontrol et ve response header'larına ekle
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
        // Origin olmadığında herhangi bir kaynağa izin ver (geliştirme için)
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    // Diğer CORS header'ları
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    // OPTIONS isteği için hemen yanıt ver ve devam etme
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
// Middleware
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.use((0, cookie_parser_1.default)());
// Request logging middleware
exports.app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Request Headers:', req.headers);
    console.log('Request Body:', req.body);
    next();
});
// Error handling middleware
exports.app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        message: 'Sunucu hatası oluştu',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// Test endpoint
exports.app.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});
// Debug route to check API structure
exports.app.get('/api/debug', (req, res) => {
    res.json({
        message: 'API DEBUG INFO',
        timestamp: new Date().toISOString(),
        routes: {
            auth: '/api/auth/*',
            users: '/api/users/*',
            surveys: '/api/surveys/*',
            businesses: '/api/businesses/*'
        },
        requestInfo: {
            method: req.method,
            url: req.url,
            originalUrl: req.originalUrl,
            baseUrl: req.baseUrl,
            path: req.path,
            hostname: req.hostname,
            ip: req.ip,
            headers: req.headers
        }
    });
});
// Routes
exports.app.use('/api/users', userRoutes_1.default);
exports.app.use('/api/auth', authRoutes_1.default);
exports.app.use('/api/surveys', surveyRoutes_1.default);
exports.app.use('/api/businesses', businessRoutes_1.default);
// Base route
exports.app.get('/', (req, res) => {
    res.json({ message: 'API is running...' });
});
// 404 handler
exports.app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint bulunamadı' });
});
