import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './config/db';
import path from 'path';

// Routes
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import surveyRoutes from './routes/surveyRoutes';
import businessRoutes from './routes/businessRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import businessSurveyRoutes from './routes/businessSurveyRoutes';
import qrCodeRoutes from './routes/qrCodeRoutes';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
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
    } else {
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
app.use(express.json({
    limit: '50mb',
    verify: (req: Request, res: Response, buf: Buffer, encoding: string) => {
        if (buf.length) {
            try {
                JSON.parse(buf.toString());
            } catch (e: any) {
                console.error('JSON Parsing Error:', e);
                // Sadece logla, hata fırlatma - bunu express'in kendi yönetmesine izin ver
            }
        }
        return true;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Serve favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // Return "No Content" status
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);

    // Sadece geliştirme modunda tam istek detaylarını logla
    if (process.env.NODE_ENV === 'development') {
        console.log('Request Headers:', req.headers);
        console.log('Request Body:', req.body);
    } else {
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
app.use((req: Request, res: Response, next: NextFunction) => {
    // Orijinal json metodunu yedekle
    const originalJson = res.json;

    // JSON yanıtlarını standardize et
    res.json = function (body: any): Response {
        try {
            // Null/undefined kontrolü
            if (body === null || body === undefined) {
                body = {};
            }

            // success flag'i ekle - yoksa otomatik olarak ekle
            if (typeof body === 'object' && !('success' in body)) {
                const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
                body = {
                    success: isSuccess,
                    ...body
                };
            }

            // Orijinal json metodunu çağır
            return originalJson.call(this, body);
        } catch (error) {
            console.error('API yanıt formatı hatası:', error);

            // Hata durumunda basit yanıt döndür
            return originalJson.call(this, {
                success: false,
                message: 'API yanıt formatı hatası',
                error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
            });
        }
    };

    next();
});

// Tüm rotaları kaydet (debugging için)
const availableRoutes: string[] = [];

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/business', businessSurveyRoutes);
app.use('/api/qr-codes', qrCodeRoutes);
app.use('/api', dashboardRoutes);

// Express route stack'ten mevcut rotaları topla
app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
        // Doğrudan rotalar için
        availableRoutes.push(`${Object.keys(middleware.route.methods).join(', ')} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
        // Router middleware'leri için
        const path = middleware.regexp.toString().replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ':param');
        availableRoutes.push(`Router: ${path}`);
    }
});

// Base route
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'API is running...' });
});

// Ping endpoint - bağlantı testi için
app.get('/api/ping', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Pong!', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'Test başarılı!', timestamp: new Date().toISOString() });
});

// Routes endpoint - kullanılabilir rotaları gösterir (sadece geliştirme modunda)
app.get('/api/routes', (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'development') {
        res.status(200).json({ routes: availableRoutes });
    } else {
        res.status(403).json({ message: 'Bu endpoint sadece geliştirme modunda kullanılabilir' });
    }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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
    } catch (jsonError) {
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
app.use((req: Request, res: Response) => {
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

export { app };