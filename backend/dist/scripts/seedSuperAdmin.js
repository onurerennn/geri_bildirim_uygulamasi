"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const dotenv = __importStar(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const UserRole_1 = require("../types/UserRole");
// Önce .env dosyasını yükle
dotenv.config();
console.log('Super Admin oluşturma scripti başlatılıyor...');
console.log('Kullanılacak MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback-app');
const seedSuperAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // MongoDB bağlantısı
        console.log('MongoDB bağlantısı kuruluyor...');
        yield mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback-app');
        console.log('MongoDB bağlantısı başarılı');
        // Süper admin kullanıcı bilgileri
        const superAdminData = {
            name: 'Super Admin',
            email: 'onurerenejder36@gmail.com',
            password: 'ejder3636',
            role: UserRole_1.UserRole.SUPER_ADMIN,
            isActive: true
        };
        console.log('Oluşturulacak Super Admin bilgileri:', {
            name: superAdminData.name,
            email: superAdminData.email,
            role: superAdminData.role
        });
        // Önce mevcut kullanıcıyı kontrol et
        console.log('Mevcut süper admin kullanıcısı kontrol ediliyor...');
        let existingUser = yield User_1.default.findOne({ email: superAdminData.email });
        if (existingUser) {
            console.log('Mevcut süper admin kullanıcısı bulundu:', existingUser._id);
            console.log('Kullanıcı bilgileri güncelleniyor...');
            existingUser.name = superAdminData.name;
            existingUser.password = superAdminData.password;
            existingUser.role = superAdminData.role;
            existingUser.isActive = superAdminData.isActive;
            yield existingUser.save();
            console.log('Süper admin kullanıcısı başarıyla güncellendi');
        }
        else {
            console.log('Mevcut süper admin kullanıcısı bulunamadı');
            console.log('Yeni süper admin kullanıcısı oluşturuluyor...');
            const newSuperAdmin = new User_1.default(superAdminData);
            const savedAdmin = yield newSuperAdmin.save();
            console.log('Süper admin kullanıcısı başarıyla oluşturuldu:', savedAdmin._id);
        }
        // Tüm süper admin kullanıcılarını listele
        const allSuperAdmins = yield User_1.default.find({ role: UserRole_1.UserRole.SUPER_ADMIN }).select('name email role');
        console.log('Sistemdeki tüm süper admin kullanıcıları:', allSuperAdmins);
        // Bağlantıyı kapat ve çık
        yield mongoose_1.default.connection.close();
        console.log('MongoDB bağlantısı kapatıldı');
        console.log('İşlem başarıyla tamamlandı');
        process.exit(0);
    }
    catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
});
// Fonksiyonu çağır
seedSuperAdmin();
