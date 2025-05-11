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
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const businessSurveyRoutes_1 = __importDefault(require("./routes/businessSurveyRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
// Connect to MongoDB
(0, db_1.default)();
// CORS middleware
app.use((req, res, next) => {
    // Allow all origins in development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Serve favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // Return "No Content" status
});
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Request Headers:', req.headers);
    console.log('Request Body:', req.body);
    // Mevcut yolları ve yapılandırılmış rotaları kontrol et
    console.log('URL Info:', {
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path,
        route: req.route || 'Not yet routed',
        params: req.params
    });
    next();
});
// Routes
app.use('/api/users', userRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/surveys', surveyRoutes_1.default);
app.use('/api/businesses', businessRoutes_1.default);
app.use('/api/business', businessSurveyRoutes_1.default);
app.use('/api', dashboardRoutes_1.default);
// Base route
app.get('/', (req, res) => {
    res.json({ message: 'API is running...' });
});
// Ping endpoint - bağlantı testi için
app.get('/api/ping', (req, res) => {
    res.status(200).json({ message: 'Pong!', timestamp: new Date().toISOString() });
});
// Test endpoint
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'Test başarılı!', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    // Specific error handling
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation Error',
            errors: err.errors
        });
    }
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            message: 'Unauthorized Access'
        });
    }
    // Default error response
    res.status(err.status || 500).json({
        message: err.message || 'Sunucu hatası oluştu',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});
// 404 handler - must be last
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint bulunamadı' });
});
