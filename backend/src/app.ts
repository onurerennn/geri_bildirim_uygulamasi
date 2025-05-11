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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // Return "No Content" status
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
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
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/business', businessSurveyRoutes);
app.use('/api', dashboardRoutes);

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

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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
app.use((req: Request, res: Response) => {
    res.status(404).json({ message: 'Endpoint bulunamadı' });
});

export { app }; 