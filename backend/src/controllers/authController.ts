import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { UserRole } from '../types/UserRole';
import Business from '../models/Business';

// Token oluşturma fonksiyonu
const generateToken = (id: string): string => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'gizlianahtar', {
        expiresIn: '30d',
    });
};

// @desc    Kullanıcı kaydı
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response) => {
    try {
        console.log('KAYIT İSTEĞİ ALINDI:', {
            ...req.body,
            password: req.body.password ? '***' : undefined
        });

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
        const userExists = await User.findOne({ email });

        if (userExists) {
            console.log('Kayıt hatası: Email zaten kullanımda:', email);
            return res.status(400).json({
                success: false,
                message: 'Bu email adresi zaten kullanılıyor',
            });
        }

        // Şifreyi hashleme
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Kullanıcıyı oluştur
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || UserRole.CUSTOMER,
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
        } else {
            console.log('Kayıt hatası: Kullanıcı oluşturulamadı');
            res.status(400).json({
                success: false,
                message: 'Geçersiz kullanıcı bilgileri',
            });
        }
    } catch (error: any) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: error.message,
        });
    }
};

// @desc    Kullanıcı girişi
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
    try {
        console.log('---------------------------------------');
        console.log('LOGIN İSTEĞİ ALINDI');
        console.log('İstek gövdesi:', {
            ...req.body,
            password: req.body.password ? '***' : undefined
        });

        const { email, password, businessId } = req.body;

        // Gerekli alanların kontrolü
        if (!email || !password) {
            console.error('GİRİŞ HATASI: Email veya şifre eksik');
            return res.status(400).json({ message: 'Email ve şifre alanları zorunludur' });
        }

        try {
            // 1. Önce normal kullanıcı olarak giriş dene
            console.log('Kullanıcı tablosunda arama yapılıyor...');
            const user = await User.findOne({ email }).select('+password');

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
                    isMatch = await user.comparePassword(password);
                } catch (passwordError) {
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
                            isMatch = await bcrypt.compare(password, user.password);
                            console.log('DEV MODE: Doğrudan bcrypt sonucu:', isMatch);
                        } catch (bcryptError) {
                            console.error('DEV MODE: Doğrudan bcrypt hatası:', bcryptError);
                        }
                    }
                }

                if (isMatch) {
                    console.log('Şifre doğrulandı, token oluşturuluyor');
                    // Token oluştur
                    const token = jwt.sign(
                        { id: user._id },
                        process.env.JWT_SECRET || 'default_secret',
                        { expiresIn: '30d' }
                    );

                    // Şifreyi response'dan kaldır
                    const userData = user.toJSON();

                    // Giriş başarılı
                    console.log('GİRİŞ BAŞARILI. Kullanıcı:', {
                        id: user._id,
                        email: user.email,
                        role: user.role
                    });
                    console.log('---------------------------------------');

                    return res.json({
                        success: true,
                        token,
                        data: userData
                    });
                } else {
                    console.error('GİRİŞ HATASI: Şifre yanlış');
                }
            } else {
                console.log('Kullanıcı bulunamadı, işletme kontrolü yapılıyor...');
            }

            // 2. Kullanıcı bulunamazsa veya şifre yanlışsa, işletme hesabı olarak dene
            console.log('İşletme tablosunda arama yapılıyor...');
            const business = await Business.findOne({ email }).select('+password');

            if (business) {
                console.log('İşletme bulundu, şifre kontrol ediliyor...');

                // İşletme şifresi doğrulama (bcrypt ile)
                const isMatch = await bcrypt.compare(password, business.password);

                if (isMatch) {
                    console.log('İşletme şifresi doğru, admin hesabı kontrol ediliyor...');

                    // İşletmenin admin kullanıcısını bul
                    const businessAdmin = await User.findOne({
                        email,
                        role: UserRole.BUSINESS_ADMIN,
                        business: business._id
                    });

                    if (businessAdmin) {
                        console.log('İşletme admin hesabı bulundu, token oluşturuluyor');
                        // Token oluştur (admin için)
                        const token = jwt.sign(
                            { id: businessAdmin._id },
                            process.env.JWT_SECRET || 'default_secret',
                            { expiresIn: '30d' }
                        );

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

                        return res.json({
                            success: true,
                            token,
                            data: adminData
                        });
                    } else {
                        console.log('Admin hesabı bulunamadı, otomatik oluşturuluyor...');

                        // Admin yoksa otomatik oluştur
                        const newBusinessAdmin = new User({
                            name: `${business.name} Admin`,
                            email: business.email,
                            password: business.password, // Şifre zaten hash'li durumda
                            role: UserRole.BUSINESS_ADMIN,
                            business: business._id,
                            isActive: true
                        });

                        // Şifre zaten hashli olduğu için pre-save hook'unu atla
                        newBusinessAdmin.isNew = false;
                        await newBusinessAdmin.save();

                        console.log('Yeni admin hesabı oluşturuldu, token oluşturuluyor');

                        // Token oluştur (yeni admin için)
                        const token = jwt.sign(
                            { id: newBusinessAdmin._id },
                            process.env.JWT_SECRET || 'default_secret',
                            { expiresIn: '30d' }
                        );

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

                        return res.json({
                            success: true,
                            token,
                            data: adminData
                        });
                    }
                } else {
                    console.error('İŞLETME GİRİŞİ HATASI: Şifre yanlış');
                }
            } else {
                console.log('İşletme de bulunamadı');
            }

            // Ne kullanıcı ne de işletme bulunamadı veya şifre yanlış
            console.error('GİRİŞ BAŞARISIZ: Geçersiz kimlik bilgileri');
            console.log('---------------------------------------');

            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre'
            });

        } catch (innerError: any) {
            console.error('Giriş işlemi hatası (iç):', innerError.message);
            console.error('Stack:', innerError.stack);
            throw innerError;
        }
    } catch (error: any) {
        console.error('Giriş işlemi hatası (dış):', error.message);
        console.error('Stack:', error.stack);
        console.log('---------------------------------------');

        res.status(500).json({
            success: false,
            message: 'Giriş işlemi sırasında bir hata oluştu',
            error: error.message
        });
    }
};

// @desc    Kullanıcı çıkışı
// @route   POST /api/auth/logout
// @access  Private
export const logout = (req: Request, res: Response) => {
    try {
        res.cookie('token', '', {
            httpOnly: true,
            expires: new Date(0),
        });

        res.status(200).json({
            success: true,
            message: 'Başarıyla çıkış yapıldı',
        });
    } catch (error: any) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: error.message,
        });
    }
};

// @desc    Kullanıcı bilgilerini getir
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

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
    } catch (error: any) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: error.message,
        });
    }
};

// @desc    Kullanıcı profilini getir
// @route   GET /api/auth/profile
// @access  Özel
export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            });
        } else {
            res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
    } catch (error) {
        console.error('Profil getirme hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası oluştu' });
    }
};

// @desc    Super Admin oluştur
// @route   POST /api/auth/create-super-admin
// @access  Herkese açık (sadece geliştirme aşamasında)
export const createSuperAdmin = async (req: Request, res: Response) => {
    try {
        console.log('Super Admin oluşturma isteği alındı');

        // Admin bilgileri
        const adminData = {
            name: 'Super Admin',
            email: 'onurerenejder36@gmail.com',
            password: 'ejder3636',
            role: UserRole.SUPER_ADMIN,
            isActive: true
        };

        console.log('Super Admin bilgileri:', {
            email: adminData.email,
            role: adminData.role
        });

        // Mevcut Super Admin kontrolü
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Bu e-posta ile kullanıcı zaten var. Güncelleniyor...');

            // Yeni bir instance oluştur ve save() metodunu kullan
            existingAdmin.name = adminData.name;
            existingAdmin.password = adminData.password;
            existingAdmin.role = adminData.role;
            existingAdmin.isActive = adminData.isActive;

            await existingAdmin.save();

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
        const admin = new User(adminData);
        await admin.save();

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
    } catch (error) {
        console.error('Super Admin oluşturma hatası:', error);
        res.status(500).json({ message: 'Super Admin oluşturulurken bir hata oluştu' });
    }
}; 