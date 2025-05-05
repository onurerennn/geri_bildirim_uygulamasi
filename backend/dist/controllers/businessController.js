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
exports.createDefaultBusiness = exports.addBusinessAdmin = exports.approveBusiness = exports.deleteBusiness = exports.updateBusiness = exports.createBusiness = exports.getBusiness = exports.getBusinesses = void 0;
const Business_1 = __importDefault(require("../models/Business"));
const User_1 = __importDefault(require("../models/User"));
const UserRole_1 = require("../types/UserRole");
const bcrypt = __importStar(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
// İşletmeleri listele
const getBusinesses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('İşletmeler getiriliyor...');
        console.log('Kullanıcı:', ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) || 'Bilinmiyor');
        const businesses = yield Business_1.default.find()
            .select('-password')
            .populate('approvedBy', 'name email');
        console.log('İşletmeler başarıyla getirildi:', businesses.length);
        console.log('İşletme örneği:', businesses[0] || 'Hiç işletme yok');
        // Doğrudan businesses dizisini döndür (önceki versiyon ile uyumluluk için)
        res.status(200).json(businesses);
    }
    catch (error) {
        console.error('İşletmeler listelenirken hata:', error);
        console.error('Hata detayları:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'İşletmeler listelenirken bir hata oluştu.',
            error: error.message
        });
    }
});
exports.getBusinesses = getBusinesses;
// İşletme detayını getir
const getBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const business = yield Business_1.default.findById(req.params.id).populate('approvedBy', 'name');
        if (!business) {
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }
        res.json(business);
    }
    catch (error) {
        res.status(500).json({ message: 'İşletme getirilirken bir hata oluştu.' });
    }
});
exports.getBusiness = getBusiness;
// Yeni işletme oluştur
const createBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('---------------------------------------');
        console.log('İŞLETME OLUŞTURMA İSTEĞİ ALINDI');
        console.log('URL:', req.originalUrl);
        console.log('HTTP Metodu:', req.method);
        console.log('İstek Gövdesi:', req.body);
        console.log('İstek Headers:', req.headers);
        const user = req.user;
        console.log('Kullanıcı Bilgileri:', {
            id: user === null || user === void 0 ? void 0 : user._id,
            email: user === null || user === void 0 ? void 0 : user.email,
            role: user === null || user === void 0 ? void 0 : user.role
        });
        // Kullanıcı kontrolü
        if (!user || user.role !== UserRole_1.UserRole.SUPER_ADMIN) {
            console.error('YETKİ HATASI:', (user === null || user === void 0 ? void 0 : user.role) || 'Kullanıcı bilgisi yok');
            return res.status(403).json({
                success: false,
                message: 'Bu işlemi sadece SUPER_ADMIN yapabilir.'
            });
        }
        const { name, address, phone, email, description, logo, password } = req.body;
        console.log('Alınan Veriler:', {
            name, address, phone, email, description, logo,
            password: password ? '***' : undefined
        });
        // Gerekli alanların kontrolü
        if (!name || !address || !phone || !email || !password) {
            console.error('VERİ DOĞRULAMA HATASI:', {
                name: !!name,
                address: !!address,
                phone: !!phone,
                email: !!email,
                password: !!password
            });
            return res.status(400).json({
                success: false,
                message: 'Lütfen tüm zorunlu alanları doldurun.',
                validationErrors: {
                    name: !name ? 'İşletme adı zorunludur' : null,
                    address: !address ? 'Adres zorunludur' : null,
                    phone: !phone ? 'Telefon zorunludur' : null,
                    email: !email ? 'E-posta zorunludur' : null,
                    password: !password ? 'Şifre zorunludur' : null
                }
            });
        }
        // E-posta kontrolü
        const existingBusiness = yield Business_1.default.findOne({ email });
        if (existingBusiness) {
            console.log('E-POSTA ÇAKIŞMASI:', email);
            return res.status(400).json({
                success: false,
                message: 'Bu e-posta adresi zaten kullanımda.',
                field: 'email'
            });
        }
        try {
            // Şifreyi hashleme
            const salt = yield bcrypt.genSalt(10);
            const hashedPassword = yield bcrypt.hash(password, salt);
            console.log('Şifre Hashlendi');
            // İşletme oluşturma
            const business = new Business_1.default({
                name,
                address,
                phone,
                email,
                description,
                logo,
                password: hashedPassword,
                isApproved: true, // Super Admin oluşturduğu için otomatik onaylı
                isActive: true,
                approvedBy: user._id // Onaylayan Super Admin
            });
            console.log('Oluşturulacak İşletme Modeli:', Object.assign(Object.assign({}, business.toObject()), { password: '***' }));
            yield business.save();
            console.log('İŞLETME KAYDEDİLDİ:', business._id.toString());
            try {
                // İşletme admin kullanıcısını oluştur
                const businessAdmin = yield User_1.default.create({
                    name: `${name} Admin`,
                    email,
                    password: hashedPassword,
                    role: UserRole_1.UserRole.BUSINESS_ADMIN,
                    business: business._id
                });
                console.log('İŞLETME ADMIN HESABI OLUŞTURULDU:', {
                    id: businessAdmin._id,
                    email: businessAdmin.email,
                    role: businessAdmin.role
                });
            }
            catch (adminError) {
                console.error('ADMIN OLUŞTURMA HATASI:', adminError.message);
                // Admin oluşturulamasa bile işletmeyi silmiyoruz, sadece hata loglanıyor
            }
            // Populate approvedBy alanı
            yield business.populate('approvedBy', 'name email');
            // Şifreyi response'dan çıkar
            const businessObj = business.toObject();
            // Type assertion ile password özelliğini güvenli bir şekilde sil
            const businessWithPassword = businessObj;
            delete businessWithPassword.password;
            console.log('İŞLETME BAŞARIYLA OLUŞTURULDU');
            console.log('---------------------------------------');
            res.status(201).json({
                success: true,
                message: 'İşletme ve admin hesabı başarıyla oluşturuldu.',
                business: businessWithPassword
            });
        }
        catch (innerError) {
            console.error('İŞLEM HATASI:', innerError.message);
            console.error('STACK:', innerError.stack);
            throw innerError; // Dış catch bloğuna yönlendir
        }
    }
    catch (error) {
        console.error('İŞLETME OLUŞTURMA GENEL HATASI:', error.message);
        console.error('STACK:', error.stack);
        console.log('---------------------------------------');
        res.status(500).json({
            success: false,
            message: 'İşletme oluşturulurken bir hata oluştu.',
            error: error.message
        });
    }
});
exports.createBusiness = createBusiness;
// İşletme güncelle
const updateBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, address, phone, email, description, logo, isActive, password } = req.body;
        // Check if business exists
        const business = yield Business_1.default.findById(id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }
        // Check for email conflict if email is being updated
        if (email && email !== business.email) {
            const existingBusiness = yield Business_1.default.findOne({ email });
            if (existingBusiness) {
                return res.status(400).json({ message: 'Email already in use by another business' });
            }
        }
        // Update fields
        const updateData = {};
        if (name)
            updateData.name = name;
        if (address)
            updateData.address = address;
        if (phone)
            updateData.phone = phone;
        if (email)
            updateData.email = email;
        if (description !== undefined)
            updateData.description = description;
        if (logo !== undefined)
            updateData.logo = logo;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        // Hash password if provided
        if (password) {
            const salt = yield bcrypt.genSalt(10);
            updateData.password = yield bcrypt.hash(password, salt);
        }
        const updatedBusiness = yield Business_1.default.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
        return res.status(200).json(updatedBusiness);
    }
    catch (error) {
        console.error('Error updating business:', error);
        return res.status(500).json({ message: 'Error updating business', error });
    }
});
exports.updateBusiness = updateBusiness;
// İşletme sil
const deleteBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`İşletme silme isteği alındı. ID: ${req.params.id}`);
        // İşletmeyi bul
        const business = yield Business_1.default.findById(req.params.id);
        if (!business) {
            console.log('İşletme bulunamadı:', req.params.id);
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }
        console.log(`İşletme bulundu. İşletme adı: ${business.name}, ID: ${business._id}`);
        // İlişkili kullanıcıları sil
        console.log(`İşletmeye bağlı kullanıcılar siliniyor...`);
        const usersDeleteResult = yield User_1.default.deleteMany({ business: business._id });
        console.log(`Silinen kullanıcı sayısı: ${usersDeleteResult.deletedCount}`);
        // Mongoose modelleri doğrudan burada import edilmediği için dinamik olarak import edelim
        try {
            // İlişkili anketleri sil
            console.log(`İşletmeye bağlı anketler siliniyor...`);
            const Survey = mongoose_1.default.model('Survey');
            const surveysDeleteResult = yield Survey.deleteMany({ business: business._id });
            console.log(`Silinen anket sayısı: ${surveysDeleteResult.deletedCount}`);
            // İlişkili QR kodları sil
            console.log(`İşletmeye bağlı QR kodlar siliniyor...`);
            const QRCode = mongoose_1.default.model('QRCode');
            const qrCodesDeleteResult = yield QRCode.deleteMany({ business: business._id });
            console.log(`Silinen QR kod sayısı: ${qrCodesDeleteResult.deletedCount}`);
            // İlişkili ödülleri sil
            console.log(`İşletmeye bağlı ödüller siliniyor...`);
            const Reward = mongoose_1.default.model('Reward');
            const rewardsDeleteResult = yield Reward.deleteMany({ businessId: business._id });
            console.log(`Silinen ödül sayısı: ${rewardsDeleteResult.deletedCount}`);
            // İlişkili yanıtları sil
            console.log(`İşletmeye bağlı yanıtlar siliniyor...`);
            const Response = mongoose_1.default.model('Response');
            const responsesDeleteResult = yield Response.deleteMany({ business: business._id });
            console.log(`Silinen yanıt sayısı: ${responsesDeleteResult.deletedCount}`);
        }
        catch (modelError) {
            console.error('İlişkili verileri silerken hata:', modelError);
            // İşleme devam et - model bulunamasa bile işletmeyi silmeye çalışacağız
        }
        // İşletmeyi sil
        console.log(`İşletme siliniyor...`);
        yield Business_1.default.findByIdAndDelete(req.params.id);
        console.log(`İşletme başarıyla silindi: ${business._id}`);
        res.json({
            message: 'İşletme ve tüm ilişkili veriler başarıyla silindi.',
            deletedBusinessId: business._id
        });
    }
    catch (error) {
        console.error('İşletme silinirken hata oluştu:', error);
        console.error('Hata detayları:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            message: 'İşletme silinirken bir hata oluştu.',
            error: error.message
        });
    }
});
exports.deleteBusiness = deleteBusiness;
// İşletme onayla
const approveBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requestingUser = req.user;
        if (requestingUser.role !== UserRole_1.UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'İşletme onaylama yetkiniz yok.' });
        }
        const business = yield Business_1.default.findById(req.params.id);
        if (!business) {
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }
        business.isApproved = true;
        business.approvedBy = requestingUser._id;
        yield business.save();
        res.json({ message: 'İşletme başarıyla onaylandı.', business });
    }
    catch (error) {
        res.status(500).json({ message: 'İşletme onaylanırken bir hata oluştu.' });
    }
});
exports.approveBusiness = approveBusiness;
// BUSINESS_ADMIN ekle
const addBusinessAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const businessId = req.params.id;
        // SUPER_ADMIN kontrolü
        if (user.role !== UserRole_1.UserRole.SUPER_ADMIN) {
            return res.status(403).json({
                success: false,
                message: 'Bu işlemi sadece SUPER_ADMIN yapabilir.'
            });
        }
        const { name, email, password } = req.body;
        // Gerekli alanların kontrolü
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen tüm zorunlu alanları doldurun.',
                requiredFields: ['name', 'email', 'password']
            });
        }
        // İşletmenin varlığını kontrol et
        const business = yield Business_1.default.findById(businessId);
        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'İşletme bulunamadı.'
            });
        }
        // Email kontrolü
        const existingUser = yield User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Bu e-posta adresi zaten kullanımda.'
            });
        }
        // BUSINESS_ADMIN kullanıcısını oluştur
        const businessAdmin = new User_1.default({
            name,
            email,
            password,
            role: UserRole_1.UserRole.BUSINESS_ADMIN,
            business: business._id,
            isActive: true
        });
        yield businessAdmin.save();
        // Response için güvenli veri
        const adminResponse = businessAdmin.toJSON();
        console.log('İşletme admin hesabı oluşturuldu:', {
            id: businessAdmin._id,
            email: businessAdmin.email,
            role: businessAdmin.role,
            businessId: business._id
        });
        res.status(201).json({
            success: true,
            message: 'İşletme admin hesabı başarıyla oluşturuldu.',
            admin: adminResponse
        });
    }
    catch (error) {
        console.error('İşletme admin oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İşletme admin hesabı oluşturulurken bir hata oluştu.',
            error: error.message
        });
    }
});
exports.addBusinessAdmin = addBusinessAdmin;
// @desc    Create a default business (for development)
// @route   POST /api/businesses/create-default
// @access  Public (only for development)
const createDefaultBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Creating default business...');
        // Check if a default business already exists
        const existingBusiness = yield Business_1.default.findOne({ name: 'Demo İşletme' });
        if (existingBusiness) {
            console.log('Default business already exists:', existingBusiness._id);
            return res.status(200).json({
                success: true,
                message: 'Default business already exists',
                businessId: existingBusiness._id
            });
        }
        // Create a default business
        const defaultBusiness = new Business_1.default({
            name: 'Demo İşletme',
            address: 'Demo Adres 123',
            phone: '5555555555',
            email: 'demo@example.com',
            description: 'Bu işletme geliştirme amaçlı otomatik oluşturulmuştur',
            isActive: true,
            isApproved: true
        });
        yield defaultBusiness.save();
        console.log('Default business created with ID:', defaultBusiness._id);
        return res.status(201).json({
            success: true,
            message: 'Default business created successfully',
            businessId: defaultBusiness._id
        });
    }
    catch (error) {
        console.error('Error creating default business:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create default business',
            error: error.message
        });
    }
});
exports.createDefaultBusiness = createDefaultBusiness;
