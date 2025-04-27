import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './config/db';

// Routes
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import surveyRoutes from './routes/surveyRoutes';
import businessRoutes from './routes/businessRoutes';

dotenv.config();

export const app = express();

// Connect to MongoDB
connectDB();

// CORS manual middleware
app.use((req, res, next) => {
    // İstek kaynağı header'ını al
    const origin = req.headers.origin;

    // İzin verilen origin'leri kontrol et ve response header'larına ekle
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        message: 'Sunucu hatası oluştu',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// Debug route to check API structure
app.get('/api/debug', (req, res) => {
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
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/businesses', businessRoutes);

// Base route
app.get('/', (req, res) => {
    res.json({ message: 'API is running...' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint bulunamadı' });
}); 