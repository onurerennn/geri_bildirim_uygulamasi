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
exports.getBusinessCustomers = exports.createSuperAdmin = exports.getUserProfile = exports.getMe = exports.logout = exports.login = exports.register = void 0;
const bcrypt = __importStar(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const UserRole_1 = require("../types/UserRole");
const Business_1 = __importDefault(require("../models/Business"));
const Response_1 = __importDefault(require("../models/Response"));
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
        console.log('KAYIT İSTEĞİ ALINDI:', Object.assign(Object.assign({}, req.body), { password: req.body.password ? '***' : undefined }));
        const { name, email, password, role } = req.body;
        // Tüm gerekli alanların doldurulduğunu kontrol et
        if (!name || !email || !password) {
            console.log('Kayıt hatası: Eksik alanlar');
            return res.status(400).json({
                success: false,
                message: 'Lütfen tüm alanları doldurunuz',
            });
        }
        // Kullanıcının daha önce kayıtlı olup olmadığını kontrol et
        const userExists = yield User_1.default.findOne({ email });
        if (userExists) {
            console.log('Kayıt hatası: Email zaten kullanımda:', email);
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
            console.log('Kullanıcı başarıyla oluşturuldu:', {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            });
            // Token oluştur
            const token = generateToken(user._id);
            // Cookie'ye token'ı kaydet
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 gün
            });
            console.log('KAYIT BAŞARILI ve token oluşturuldu');
            res.status(201).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token, // Frontend'in otomatik giriş yapabilmesi için token döndür
            });
        }
        else {
            console.log('Kayıt hatası: Kullanıcı oluşturulamadı');
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
    try {
        console.log('---------------------------------------');
        console.log('LOGIN İSTEĞİ ALINDI');
        console.log('İstek gövdesi:', Object.assign(Object.assign({}, req.body), { password: req.body.password ? '***' : undefined }));
        const { email, password, businessId } = req.body;
        // Gerekli alanların kontrolü
        if (!email || !password) {
            console.error('GİRİŞ HATASI: Email veya şifre eksik');
            return res.status(400).json({
                success: false,
                message: 'Email ve şifre alanları zorunludur'
            });
        }
        try {
            // 1. Önce normal kullanıcı olarak giriş dene
            console.log('Kullanıcı tablosunda arama yapılıyor...');
            const user = yield User_1.default.findOne({ email }).select('+password');
            if (user) {
                // Şifre kontrolü
                console.log('Kullanıcı bulundu, şifre doğrulanıyor...');
                console.log('Kullanıcı bilgileri:', {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    passwordHash: user.password ? (user.password.substring(0, 15) + '...') : 'YOK'
                });
                // Test amacıyla doğrudan şifre eşleştirme kontrolü de yapalım
                let isMatch = false;
                try {
                    // Normal karşılaştırma metodunu dene
                    isMatch = yield user.comparePassword(password);
                }
                catch (passwordError) {
                    console.error('Şifre karşılaştırma hatası:', passwordError);
                }
                // Geliştirme amacıyla, basit şifre kontrolü
                // NOT: Bu sadece geliştirme ortamında kullanılmalıdır!
                const isDevMode = process.env.NODE_ENV !== 'production';
                if (!isMatch && isDevMode) {
                    console.log('DEV MODE: Normal şifre kontrolü başarısız, basit kontrol yapılıyor...');
                    // Yeni kayıt olan kullanıcılar ve test kullanıcıları için
                    if (password === '123456' || password === 'test123') {
                        console.log('DEV MODE: Test şifresi tespit edildi, giriş izni veriliyor!');
                        isMatch = true;
                    }
                    // Son çare: Doğrudan bcrypt karşılaştırma
                    if (!isMatch && user.password) {
                        try {
                            console.log('DEV MODE: Doğrudan bcrypt karşılaştırma deneniyor...');
                            isMatch = yield bcrypt.compare(password, user.password);
                            console.log('DEV MODE: Doğrudan bcrypt sonucu:', isMatch);
                        }
                        catch (bcryptError) {
                            console.error('DEV MODE: Doğrudan bcrypt hatası:', bcryptError);
                        }
                    }
                }
                if (isMatch) {
                    console.log('Şifre doğrulandı, token oluşturuluyor');
                    // Token oluştur
                    const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '30d' });
                    // Şifreyi response'dan kaldır
                    const userData = user.toJSON();
                    // BUSINESS_ADMIN rolü için işletme kontrol et
                    if (user.role === UserRole_1.UserRole.BUSINESS_ADMIN && !user.business) {
                        console.log('BUSINESS_ADMIN kullanıcısının işletme bilgisi yok, varsayılan işletme aranıyor...');
                        try {
                            // Sistemdeki ilk aktif işletmeyi bul
                            const defaultBusiness = yield Business_1.default.findOne({ isActive: true });
                            if (defaultBusiness) {
                                console.log('Varsayılan işletme bulundu, kullanıcıya atanıyor:', defaultBusiness._id);
                                // Kullanıcıya işletme ID'sini ata ve kaydet
                                user.business = defaultBusiness._id;
                                yield User_1.default.findByIdAndUpdate(user._id, { business: defaultBusiness._id });
                                // userData objesini de güncelle
                                userData.business = defaultBusiness._id;
                                console.log('Kullanıcıya işletme atandı:', {
                                    userId: user._id,
                                    businessId: defaultBusiness._id,
                                    businessName: defaultBusiness.name
                                });
                            }
                            else {
                                console.warn('Varsayılan işletme bulunamadı.');
                            }
                        }
                        catch (businessError) {
                            console.error('İşletme atama hatası:', businessError);
                        }
                    }
                    // Kullanıcının rolüne göre izin kontrolü
                    if (user.role === UserRole_1.UserRole.CUSTOMER) {
                        console.log('MÜŞTERİ GİRİŞİ BAŞARILI');
                    }
                    else if (user.role === UserRole_1.UserRole.BUSINESS_ADMIN) {
                        console.log('İŞLETME ADMİN GİRİŞİ BAŞARILI');
                    }
                    else if (user.role === UserRole_1.UserRole.SUPER_ADMIN) {
                        console.log('SÜPER ADMİN GİRİŞİ BAŞARILI');
                    }
                    // Giriş başarılı
                    console.log('GİRİŞ BAŞARILI. Kullanıcı:', {
                        id: user._id,
                        email: user.email,
                        role: user.role,
                        business: user.business || 'Yok'
                    });
                    console.log('---------------------------------------');
                    // Yanıt nesnesini daha güvenli hale getir
                    const safeResponse = {
                        success: true,
                        token,
                        data: {
                            _id: userData._id.toString(),
                            name: userData.name,
                            email: userData.email,
                            role: userData.role,
                            business: userData.business ? userData.business.toString() : null,
                            isActive: userData.isActive
                        }
                    };
                    return res.status(200).json(safeResponse);
                }
                else {
                    console.error('GİRİŞ HATASI: Şifre yanlış');
                }
            }
            else {
                console.log('Kullanıcı bulunamadı, işletme kontrolü yapılıyor...');
            }
            // 2. Kullanıcı bulunamazsa veya şifre yanlışsa, işletme hesabı olarak dene
            console.log('İşletme tablosunda arama yapılıyor...');
            const business = yield Business_1.default.findOne({ email }).select('+password');
            if (business) {
                console.log('İşletme bulundu, şifre kontrol ediliyor...');
                // İşletme şifresi doğrulama (bcrypt ile)
                const isMatch = yield bcrypt.compare(password, business.password);
                if (isMatch) {
                    console.log('İşletme şifresi doğru, admin hesabı kontrol ediliyor...');
                    // İşletmenin admin kullanıcısını bul
                    const businessAdmin = yield User_1.default.findOne({
                        email,
                        role: UserRole_1.UserRole.BUSINESS_ADMIN,
                        business: business._id
                    });
                    if (businessAdmin) {
                        console.log('İşletme admin hesabı bulundu, token oluşturuluyor');
                        // Token oluştur (admin için)
                        const token = jsonwebtoken_1.default.sign({ id: businessAdmin._id }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '30d' });
                        // Admin verisi
                        const adminData = businessAdmin.toJSON();
                        // Giriş başarılı (admin üzerinden)
                        console.log('İŞLETME GİRİŞİ BAŞARILI. Admin:', {
                            id: businessAdmin._id,
                            email: businessAdmin.email,
                            role: businessAdmin.role,
                            business: business._id
                        });
                        console.log('---------------------------------------');
                        // Yanıt nesnesini güvenli hale getir
                        const safeResponse = {
                            success: true,
                            token,
                            data: {
                                _id: adminData._id.toString(),
                                name: adminData.name,
                                email: adminData.email,
                                role: adminData.role,
                                business: adminData.business ? adminData.business.toString() : null,
                                isActive: adminData.isActive
                            }
                        };
                        return res.status(200).json(safeResponse);
                    }
                    else {
                        console.log('Admin hesabı bulunamadı, otomatik oluşturuluyor...');
                        // Admin yoksa otomatik oluştur
                        const newBusinessAdmin = new User_1.default({
                            name: `${business.name} Admin`,
                            email: business.email,
                            password: business.password, // Şifre zaten hash'li durumda
                            role: UserRole_1.UserRole.BUSINESS_ADMIN,
                            business: business._id,
                            isActive: true
                        });
                        // Şifre zaten hashli olduğu için pre-save hook'unu atla
                        newBusinessAdmin.isNew = false;
                        yield newBusinessAdmin.save();
                        console.log('Yeni admin hesabı oluşturuldu, token oluşturuluyor');
                        // Token oluştur (yeni admin için)
                        const token = jsonwebtoken_1.default.sign({ id: newBusinessAdmin._id }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '30d' });
                        // Yeni admin verisi
                        const adminData = newBusinessAdmin.toJSON();
                        // Giriş başarılı (yeni admin üzerinden)
                        console.log('OTOMATİK OLUŞTURULAN ADMIN GİRİŞİ BAŞARILI:', {
                            id: newBusinessAdmin._id,
                            email: newBusinessAdmin.email,
                            role: newBusinessAdmin.role,
                            business: business._id
                        });
                        console.log('---------------------------------------');
                        // Yanıt nesnesini güvenli hale getir
                        const safeResponse = {
                            success: true,
                            token,
                            data: {
                                _id: adminData._id.toString(),
                                name: adminData.name,
                                email: adminData.email,
                                role: adminData.role,
                                business: adminData.business ? adminData.business.toString() : null,
                                isActive: adminData.isActive
                            }
                        };
                        return res.status(200).json(safeResponse);
                    }
                }
                else {
                    console.error('İŞLETME GİRİŞİ HATASI: Şifre yanlış');
                }
            }
            else {
                console.log('İşletme de bulunamadı');
            }
            // Ne kullanıcı ne de işletme bulunamadı veya şifre yanlış
            console.error('GİRİŞ BAŞARISIZ: Geçersiz kimlik bilgileri');
            console.log('---------------------------------------');
            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre'
            });
        }
        catch (innerError) {
            console.error('Giriş işlemi hatası (iç):', innerError.message);
            console.error('Stack:', innerError.stack);
            return res.status(500).json({
                success: false,
                message: 'Giriş işlemi sırasında bir hata oluştu',
                error: innerError.message
            });
        }
    }
    catch (error) {
        console.error('Giriş işlemi hatası (dış):', error.message);
        console.error('Stack:', error.stack);
        console.log('---------------------------------------');
        return res.status(500).json({
            success: false,
            message: 'Giriş işlemi sırasında bir hata oluştu',
            error: error.message
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
// @desc    İşletmeye ait müşterileri getir
// @route   GET /api/users/business/:businessId/customers
// @access  Private - Business Admin
const getBusinessCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { businessId } = req.params;
        console.log(`İşletme ID: ${businessId} için müşterileri getirme isteği`);
        // İşletme mevcut mu kontrol et
        const business = yield Business_1.default.findById(businessId);
        if (!business) {
            console.error(`İşletme bulunamadı: ${businessId}`);
            return res.status(404).json({
                success: false,
                message: 'İşletme bulunamadı'
            });
        }
        console.log(`İşletme bulundu: ${business.name}`);
        // Önce işletmeye ait yanıtları bul
        const responses = yield Response_1.default.find({ business: businessId })
            .populate({
            path: 'survey',
            select: 'title description rewardPoints'
        })
            .sort({ createdAt: -1 });
        console.log(`${responses.length} adet yanıt bulundu`);
        // Müşteri bilgilerini toplamak için bir map oluştur
        const customerMap = new Map();
        // Her yanıtı işle ve müşteri bilgilerini topla
        responses.forEach(response => {
            var _a;
            // Customer bilgilerini çıkar (nesne veya ID olabilir)
            let customerId = '';
            let customerName = '';
            let customerEmail = '';
            // 1. Durum: response.customer bir nesne
            if (response.customer && typeof response.customer === 'object') {
                customerName = response.customer.name || response.customerName || 'İsimsiz Müşteri';
                customerEmail = response.customer.email || response.customerEmail || '';
                customerId = response.customer._id || response.customer.email || customerName;
            }
            // 2. Durum: Yanıttaki diğer alanlar
            else {
                customerName = response.customerName || 'İsimsiz Müşteri';
                customerEmail = response.customerEmail || '';
                customerId = ((_a = response.userId) === null || _a === void 0 ? void 0 : _a.toString()) || customerEmail || customerName;
            }
            // Benzersiz müşteri anahtarı oluştur (ID, email veya isim)
            const customerKey = customerId || customerEmail || customerName;
            if (!customerKey)
                return; // Geçersiz müşteri, atla
            // Müşteri haritada yoksa ekle, varsa bilgilerini güncelle
            if (!customerMap.has(customerKey)) {
                customerMap.set(customerKey, {
                    _id: customerId,
                    name: customerName,
                    email: customerEmail,
                    points: response.rewardPoints || 0,
                    completedSurveys: 1
                });
            }
            else {
                const customer = customerMap.get(customerKey);
                customerMap.set(customerKey, Object.assign(Object.assign({}, customer), { points: customer.points + (response.rewardPoints || 0), completedSurveys: customer.completedSurveys + 1 }));
            }
        });
        console.log(`${customerMap.size} eşsiz müşteri bulundu`);
        // Müşteri haritasını diziye dönüştür
        const customers = Array.from(customerMap.values());
        return res.status(200).json({
            success: true,
            data: customers
        });
    }
    catch (error) {
        console.error('İşletme müşterilerini getirme hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Müşteri listesi getirilirken bir hata oluştu',
            error: error.message
        });
    }
});
exports.getBusinessCustomers = getBusinessCustomers;
