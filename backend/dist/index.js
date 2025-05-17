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
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables before importing app
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const mongoose_1 = __importDefault(require("mongoose"));
// Define port
const PORT = process.env.PORT || 5000;
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...'.red.bold);
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});
// Connect to MongoDB
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const conn = yield mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback_app');
        console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
        // MongoDB indeks temizliği için kontrol
        const Survey = mongoose_1.default.model('Survey');
        if (typeof Survey.dropAllIndexes === 'function') {
            console.log('Başlangıçta indeksler kontrol ediliyor...');
            yield Survey.dropAllIndexes();
            console.log('İndeks kontrolü tamamlandı');
        }
    }
    catch (error) {
        console.error(`Error: ${error.message}`.red.bold);
        process.exit(1);
    }
});
// Start the server
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield connectDB();
        const server = app_1.default.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            console.error('UNHANDLED REJECTION! 💥 Shutting down...'.red.bold);
            console.error(err.name, err.message);
            server.close(() => {
                process.exit(1);
            });
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});
// Start the application
start();
