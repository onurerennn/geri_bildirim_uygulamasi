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
        const { name, email, password, role } = req.body;

        // Tüm gerekli alanların doldurulduğunu kontrol et
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen tüm alanları doldurunuz',
            });
        }

        // Kullanıcının daha önce kayıtlı olup olmadığını kontrol et
        const userExists = await User.findOne({ email });

        if (userExists) {
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
        } else {
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
        const user = await User.findOne({ email }).select('+password').populate('business', '_id name');
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
        const isMatch = await bcrypt.compare(password, user.password);
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
        } catch (bcryptError: any) {
            console.error('Şifre karşılaştırma hatası:', bcryptError);
            return res.status(500).json({
                success: false,
                message: 'Şifre doğrulama hatası',
                error: bcryptError.message
            });
        }

        // BUSINESS_ADMIN rolü olan kullanıcının işletme bilgisini kontrol et
        if (user.role === UserRole.BUSINESS_ADMIN && !user.business) {
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
            business: user.business?._id || user.business // Doğrudan veya populate edilmiş haliyle
        };

        console.log('Başarılı yanıt gönderiliyor:', userData);
        res.status(200).json({
            success: true,
            data: userData,
            token,
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: error.message,
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