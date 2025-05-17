import dotenv from 'dotenv';
// Load environment variables before importing app
dotenv.config();

import app from './app';
import mongoose from 'mongoose';
import colors from 'colors';

// Define port
const PORT = process.env.PORT || 5000;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...'.red.bold);
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

// Connect to MongoDB
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback_app');
        console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);

        // MongoDB indeks temizliği için kontrol
        const Survey = mongoose.model('Survey');
        if (typeof Survey.dropAllIndexes === 'function') {
            console.log('Başlangıçta indeksler kontrol ediliyor...');
            await Survey.dropAllIndexes();
            console.log('İndeks kontrolü tamamlandı');
        }
    } catch (error: any) {
        console.error(`Error: ${error.message}`.red.bold);
        process.exit(1);
    }
};

// Start the server
const start = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err: any) => {
            console.error('UNHANDLED REJECTION! 💥 Shutting down...'.red.bold);
            console.error(err.name, err.message);
            server.close(() => {
                process.exit(1);
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the application
start(); 