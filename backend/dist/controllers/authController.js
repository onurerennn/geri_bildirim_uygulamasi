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
exports.createSuperAdmin = exports.getUserProfile = exports.getMe = exports.logout = exports.login = exports.register = void 0;
const bcrypt = __importStar(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const UserRole_1 = require("../types/UserRole");
// Token oluşturma fonksiyonu
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'gizlianahtar', {
        expiresIn: '30d',
    });
};
// @desc    Kullanıcı kaydı
// @route   POST /api/auth/register
// @access  Public
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role } = req.body;
        // Tüm gerekli alanların doldurulduğunu kontrol et
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen tüm alanları doldurunuz',
            });
        }
        // Kullanıcının daha önce kayıtlı olup olmadığını kontrol et
        const userExists = yield User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'Bu email adresi zaten kullanılıyor',
            });
        }
        // Şifreyi hashleme
        const salt = yield bcrypt.genSalt(10);
        const hashedPassword = yield bcrypt.hash(password, salt);
        // Kullanıcıyı oluştur
        const user = yield User_1.default.create({
            name,
            email,
            password: hashedPassword,
            role: role || UserRole_1.UserRole.CUSTOMER,
        });
        if (user) {
            // Token oluştur
            const token = generateToken(user._id);
            // Cookie'ye token'ı kaydet
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 gün
            });
            res.status(201).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token,
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Geçersiz kullanıcı bilgileri',
            });
        }
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: error.message,
        });
    }
});
exports.register = register;
// @desc    Kullanıcı girişi
// @route   POST /api/auth/login
// @access  Public
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('Login isteği alındı:', { body: req.body });
        const { email, password } = req.body;
        // Email ve şifrenin gönderilmiş olduğunu kontrol et
        if (!email || !password) {
            console.log('Eksik bilgi:', { email: !!email, password: !!password });
            return res.status(400).json({
                success: false,
                message: 'Lütfen email ve şifre giriniz',
            });
        }
        // Kullanıcıyı bul ve business alanını da getir
        const user = yield User_1.default.findOne({ email }).select('+password').populate('business', '_id name');
        console.log('Kullanıcı bulundu mu:', {
            found: !!user,
            email,
            hasPassword: user ? !!user.password : false,
            userDetails: user ? {
                _id: user._id,
                email: user.email,
                role: user.role,
                business: user.business || null,
                passwordLength: user.password ? user.password.length : 0
            } : null
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre',
            });
        }
        if (!user.password) {
            console.error('Kullanıcının şifresi yok!');
            return res.status(500).json({
                success: false,
                message: 'Kullanıcı şifresi bulunamadı',
            });
        }
        // Şifreyi kontrol et
        try {
            const isMatch = yield bcrypt.compare(password, user.password);
            console.log('Şifre karşılaştırma sonucu:', {
                isMatch,
                providedPassword: password,
                hashedPasswordLength: user.password.length
            });
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Geçersiz email veya şifre',
                });
            }
        }
        catch (bcryptError) {
            console.error('Şifre karşılaştırma hatası:', bcryptError);
            return res.status(500).json({
                success: false,
                message: 'Şifre doğrulama hatası',
                error: bcryptError.message
            });
        }
        // BUSINESS_ADMIN rolü olan kullanıcının işletme bilgisini kontrol et
        if (user.role === UserRole_1.UserRole.BUSINESS_ADMIN && !user.business) {
            console.warn(`BUSINESS_ADMIN kullanıcısı (${user._id}) için işletme bilgisi yok!`);
        }
        // Token oluştur
        const token = generateToken(user._id);
        console.log('Token oluşturuldu');
        // Cookie'ye token'ı kaydet
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 gün
        });
        // Yanıt için kullanıcı verisini hazırla
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            business: ((_a = user.business) === null || _a === void 0 ? void 0 : _a._id) || user.business // Doğrudan veya populate edilmiş haliyle
        };
        console.log('Başarılı yanıt gönderiliyor:', userData);
        res.status(200).json({
            success: true,
            data: userData,
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: error.message,
        });
    }
});
exports.login = login;
// @desc    Kullanıcı çıkışı
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
    try {
        res.cookie('token', '', {
            httpOnly: true,
            expires: new Date(0),
        });
        res.status(200).json({
            success: true,
            message: 'Başarıyla çıkış yapıldı',
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: error.message,
        });
    }
};
exports.logout = logout;
// @desc    Kullanıcı bilgilerini getir
// @route   GET /api/auth/me
// @access  Private
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı',
            });
        }
        res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: error.message,
        });
    }
});
exports.getMe = getMe;
// @desc    Kullanıcı profilini getir
// @route   GET /api/auth/profile
// @access  Özel
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            });
        }
        else {
            res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
    }
    catch (error) {
        console.error('Profil getirme hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası oluştu' });
    }
});
exports.getUserProfile = getUserProfile;
// @desc    Super Admin oluştur
// @route   POST /api/auth/create-super-admin
// @access  Herkese açık (sadece geliştirme aşamasında)
const createSuperAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Super Admin oluşturma isteği alındı');
        // Admin bilgileri
        const adminData = {
            name: 'Super Admin',
            email: 'onurerenejder36@gmail.com',
            password: 'ejder3636',
            role: UserRole_1.UserRole.SUPER_ADMIN,
            isActive: true
        };
        console.log('Super Admin bilgileri:', {
            email: adminData.email,
            role: adminData.role
        });
        // Mevcut Super Admin kontrolü
        const existingAdmin = yield User_1.default.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Bu e-posta ile kullanıcı zaten var. Güncelleniyor...');
            // Yeni bir instance oluştur ve save() metodunu kullan
            existingAdmin.name = adminData.name;
            existingAdmin.password = adminData.password;
            existingAdmin.role = adminData.role;
            existingAdmin.isActive = adminData.isActive;
            yield existingAdmin.save();
            console.log('Mevcut Super Admin güncellendi:', existingAdmin._id);
            return res.status(200).json({
                message: 'Super Admin başarıyla güncellendi',
                admin: {
                    id: existingAdmin._id,
                    email: existingAdmin.email,
                    name: existingAdmin.name,
                    role: existingAdmin.role
                },
                loginInfo: {
                    email: adminData.email,
                    password: adminData.password
                }
            });
        }
        console.log('Yeni Super Admin oluşturuluyor...');
        // Yeni bir instance oluştur ve save() metodunu kullan
        const admin = new User_1.default(adminData);
        yield admin.save();
        console.log('Super Admin başarıyla oluşturuldu:', admin._id);
        res.status(201).json({
            message: 'Super Admin başarıyla oluşturuldu',
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                createdAt: admin.createdAt
            },
            loginInfo: {
                email: adminData.email,
                password: adminData.password
            }
        });
    }
    catch (error) {
        console.error('Super Admin oluşturma hatası:', error);
        res.status(500).json({ message: 'Super Admin oluşturulurken bir hata oluştu' });
    }
});
exports.createSuperAdmin = createSuperAdmin;
