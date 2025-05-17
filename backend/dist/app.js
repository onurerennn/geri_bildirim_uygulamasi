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
const qrCodeRoutes_1 = __importDefault(require("./routes/qrCodeRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
// Connect to MongoDB
(0, db_1.default)();
// CORS middleware
app.use((req, res, next) => {
    // İstemcinin origin bilgisini al
    const origin = req.headers.origin || '';
    // İzin verilen originler
    const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://172.20.10.2:3000',
        'http://172.20.10.2:19000',
        'http://localhost:19000',
        'http://localhost:19006'
    ];
    // İstemcinin origin'i bizim izin verdiğimiz listede mi?
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
        // Geliştirme aşamasında herkese izin ver
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
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
app.use(express_1.default.json({
    limit: '50mb',
    verify: (req, res, buf, encoding) => {
        if (buf.length) {
            try {
                JSON.parse(buf.toString());
            }
            catch (e) {
                console.error('JSON Parsing Error:', e);
                // Sadece logla, hata fırlatma - bunu express'in kendi yönetmesine izin ver
            }
        }
        return true;
    }
}));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, cookie_parser_1.default)());
// Serve favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // Return "No Content" status
});
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    // Sadece geliştirme modunda tam istek detaylarını logla
    if (process.env.NODE_ENV === 'development') {
        console.log('Request Headers:', req.headers);
        console.log('Request Body:', req.body);
    }
    else {
        // Prod modunda sadece önemli bilgileri logla
        console.log('Request Auth:', req.headers.authorization ? 'Present' : 'None');
        console.log('Request Content-Type:', req.headers['content-type']);
    }
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
// Response format middleware - API yanıtlarını standartlaştırma
app.use((req, res, next) => {
    // Orijinal json metodunu yedekle
    const originalJson = res.json;
    // JSON yanıtlarını standardize et
    res.json = function (body) {
        try {
            // Null/undefined kontrolü
            if (body === null || body === undefined) {
                body = {};
            }
            // success flag'i ekle - yoksa otomatik olarak ekle
            if (typeof body === 'object' && !('success' in body)) {
                const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
                body = Object.assign({ success: isSuccess }, body);
            }
            // Orijinal json metodunu çağır
            return originalJson.call(this, body);
        }
        catch (error) {
            console.error('API yanıt formatı hatası:', error);
            // Hata durumunda basit yanıt döndür
            return originalJson.call(this, {
                success: false,
                message: 'API yanıt formatı hatası',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };
    next();
});
// Tüm rotaları kaydet (debugging için)
const availableRoutes = [];
// Routes
app.use('/api/users', userRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/surveys', surveyRoutes_1.default);
app.use('/api/businesses', businessRoutes_1.default);
app.use('/api/business', businessSurveyRoutes_1.default);
app.use('/api/qr-codes', qrCodeRoutes_1.default);
app.use('/api', dashboardRoutes_1.default);
// Express route stack'ten mevcut rotaları topla
app._router.stack.forEach((middleware) => {
    if (middleware.route) {
        // Doğrudan rotalar için
        availableRoutes.push(`${Object.keys(middleware.route.methods).join(', ')} ${middleware.route.path}`);
    }
    else if (middleware.name === 'router') {
        // Router middleware'leri için
        const path = middleware.regexp.toString().replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ':param');
        availableRoutes.push(`Router: ${path}`);
    }
});
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
// Routes endpoint - kullanılabilir rotaları gösterir (sadece geliştirme modunda)
app.get('/api/routes', (req, res) => {
    if (process.env.NODE_ENV === 'development') {
        res.status(200).json({ routes: availableRoutes });
    }
    else {
        res.status(403).json({ message: 'Bu endpoint sadece geliştirme modunda kullanılabilir' });
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    // Specific error handling
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.errors
        });
    }
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized Access'
        });
    }
    // MongoDB hatalarını özel olarak ele al
    if (err.name === 'MongoServerError') {
        // Duplicate key error
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Kayıt zaten mevcut',
                details: process.env.NODE_ENV === 'development' ? err.keyValue : {}
            });
        }
    }
    // Tüm gönderilecek yanıtların JSON formatına uygunluğunu kontrol et
    try {
        const errorMessage = err.message || 'Sunucu hatası oluştu';
        // Test et - bu obje JSON'a dönüştürülebilir mi?
        const testObj = {
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? (err.toString ? err.toString() : JSON.stringify(err)) : {},
            path: req.originalUrl
        };
        // JSON stringfy/parse ile test et
        JSON.parse(JSON.stringify(testObj));
        // Eğer buraya kadar geldiyse, yanıt güvenli
        res.status(err.status || 500).json(testObj);
    }
    catch (jsonError) {
        // JSON dönüşümü sırasında hata oluştu - basit yanıt gönder
        console.error('Yanıt JSON dönüşüm hatası!', jsonError);
        res.status(500).json({
            success: false,
            message: 'İşleminiz sırasında bir hata oluştu',
            safeError: err.name || 'ServerError'
        });
    }
});
// 404 handler - must be last
app.use((req, res) => {
    console.log(`404 - Endpoint bulunamadı: ${req.method} ${req.originalUrl}`);
    // Geliştirme modunda daha detaylı bilgi
    if (process.env.NODE_ENV === 'development') {
        return res.status(404).json({
            success: false,
            message: 'Endpoint bulunamadı',
            requestedPath: req.originalUrl,
            method: req.method,
            availableRoutes: availableRoutes.length > 0 ?
                'Mevcut rotaları görmek için /api/routes endpoint\'ini kullanın' :
                'Hiç rota yapılandırılmamış'
        });
    }
    // Üretim modunda daha basit mesaj
    res.status(404).json({
        success: false,
        message: 'Endpoint bulunamadı. Lütfen daha sonra tekrar deneyin.'
    });
});
// Server başlatıldığında rota bilgilerini yazdır
console.log('⭐️ Sunucu yapılandırıldı, rotalar:');
availableRoutes.forEach(route => console.log(` - ${route}`));
