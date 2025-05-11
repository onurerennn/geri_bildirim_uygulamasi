import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { UserRole } from '../types/UserRole';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface DecodedToken {
    id: string;
}

/**
 * İşletme admini veya super admin kontrolü yapan middleware
 * Kullanıcı rolünü büyük-küçük harf duyarsız şekilde kontrol eder
 */
export const checkBusinessAdminOrSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    console.log('🔒 Özel rol kontrolü yapılıyor, kullanıcı:', req.user ? {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
    } : 'Kullanıcı bilgisi yok');

    // Kullanıcı bilgisi kontrol
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Kimlik doğrulama başarısız. Lütfen giriş yapın.'
        });
    }

    // BUSINESS_ADMIN rolünde ve business atanmamışsa, otomatik business ata
    if (String(req.user.role).toUpperCase().includes('BUSINESS_ADMIN') && !req.user.business) {
        console.log('⚠️ İşletme yöneticisine işletme atanmamış, otomatik oluşturuluyor');

        // Kullanıcı ID'sine dayalı bir business ID oluştur - 'undefined' sorununu gidermek için kontrol ekle
        if (req.user.id && req.user.id !== 'undefined') {
            req.user.business = `business_${req.user.id}`;
        } else if (req.user._id && req.user._id !== 'undefined') {
            req.user.business = `business_${req.user._id}`;
        } else {
            // Güvenli bir fallback mekanizması
            const tempId = new mongoose.Types.ObjectId().toString();
            req.user.business = `business_${tempId}`;
        }

        console.log('✅ Otomatik işletme ID oluşturuldu:', req.user.business);
    }

    // Rol kontrolü (case-insensitive)
    const userRole = String(req.user.role || '').toUpperCase();
    const allowedRoles = ['BUSINESS_ADMIN', 'SUPER_ADMIN', 'ADMIN'];

    console.log('Kullanıcı rolü (dönüştürülmüş):', userRole);
    console.log('İzin verilen roller:', allowedRoles);

    // BUSINESS_ADMIN, SUPER_ADMIN veya herhangi bir ADMIN içeren rol yeterlidir
    if (!allowedRoles.some(role => userRole.includes(role))) {
        console.log('❌ Rol kontrolü başarısız: Bu kullanıcı işletme yöneticisi değil');

        // Geliştirme modunda her kullanıcıya izin ver
        if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Geliştirme modunda: Yetkisiz kullanıcıya erişim izni veriliyor');
            console.log('✅ Geliştirme modu: BUSINESS_ADMIN rolü atanıyor');
            req.user.role = 'BUSINESS_ADMIN';
            next();
            return;
        }

        return res.status(403).json({
            success: false,
            message: 'Bu özelliği kullanmanız için işletme admini olmanız gerekmektedir.'
        });
    }

    console.log('✅ Rol kontrolü başarılı, işlem devam ediyor');
    next();
};

/**
 * Debug modunda rol kontrolü yapan middleware
 * Hata vermez, sadece kullanıcı bilgilerini loglar ve geçer
 * Geliştirme aşamasında kullanılabilir
 */
export const debugRoleCheck = (req: Request, res: Response, next: NextFunction) => {
    console.log('🔍 DEBUG: Rol kontrolü yapılıyor (debug modu)');

    if (!req.user) {
        console.log('⚠️ Kullanıcı bilgisi bulunamadı, geliştirme modu için otomatik kullanıcı ekleniyor');
        const tempId = 'debug-user-' + Date.now();
        req.user = {
            id: tempId,
            role: 'BUSINESS_ADMIN',
            name: 'Debug User',
            email: 'debug@example.com',
            business: 'business_' + tempId
        };
    } else {
        // Kullanıcı var ama rol kontrolü için yetki ekleyelim
        req.user.role = 'BUSINESS_ADMIN';

        // Business ID yoksa ekleyelim
        if (!req.user.business && req.user.id) {
            req.user.business = 'business_' + req.user.id;
            console.log('✅ Debug modu: Kullanıcıya işletme ID atandı:', req.user.business);
        }

        console.log('✅ Mevcut kullanıcıya debug modu ile BUSINESS_ADMIN rolü atandı');
    }

    console.log('👤 Debug kullanıcı bilgileri:', {
        id: req.user.id,
        role: req.user.role,
        business: req.user.business || 'atanmamış'
    });

    next();
};

/**
 * Esnek rol kontrolü - geliştirme veya test aşamasında
 * Rol standart kontrolden geçemese bile belirli koşullarda izin verir
 */
export const flexibleRoleCheck = (req: Request, res: Response, next: NextFunction) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log('Esnek rol kontrolü, geliştirme modu:', isDevelopment);

    // Geliştirme modunda ve kullanıcı bilgisi mevcut değilse
    if (isDevelopment && !req.user) {
        console.log('⚠️ Geliştirme modu - Auth kontrolü atlıyor');
        req.user = {
            _id: 'dev-user-id',
            role: UserRole.SUPER_ADMIN,
            name: 'Geliştirici',
            email: 'developer@example.com'
        };
        req.isAuthenticated = true;
        return next();
    }

    // Eğer kullanıcı zaten mevcut ve admin rolündeyse, devam et
    if (req.user && (req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.BUSINESS_ADMIN)) {
        console.log('✅ Kullanıcı yönetici rolüne sahip, izin veriliyor');
        return next();
    }

    // Kullanıcı mevcut değilse ve geliştirme modunda değilsek, hata döndür
    if (!req.user) {
        console.warn('❌ Kullanıcı bilgisi bulunamadı, kimlik doğrulama başarısız');
        return res.status(401).json({
            success: false,
            message: 'Bu işlem için giriş yapmanız gerekiyor'
        });
    }

    // Kullanıcı mevcut ancak yetkisi yetersizse, hata döndür
    console.warn('❌ Yetkisiz erişim, kullanıcı rolü:', req.user.role);
    return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmuyor'
    });
};

// Light-weight auth middleware
export const lightAuth = async (req: Request, res: Response, next: NextFunction) => {
    console.log('Light auth middleware başlatıldı');

    try {
        // Geliştirme modunda mı?
        const isDevelopment = process.env.NODE_ENV === 'development';

        // Token kontrolü yap
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        // Token yoksa ve geliştirme modundaysak
        if (!token && isDevelopment) {
            console.log('⚠️ DEV MODU: Token yok, test kullanıcısı oluşturuluyor');
            req.user = {
                _id: 'light-auth-user',
                role: UserRole.BUSINESS_ADMIN,
                name: 'Test Kullanıcı',
                email: 'lightauth@example.com',
                business: req.params.businessId || req.query.businessId
            };
            req.isAuthenticated = true;
            return next();
        }

        // Token yoksa hata döndür
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Bu işlem için giriş yapmanız gerekiyor'
            });
        }

        // Token doğrulama
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizlianahtar') as DecodedToken;

            // Kullanıcıyı bul
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                throw new Error('Kullanıcı bulunamadı');
            }

            // Kullanıcıyı request'e ekle
            req.user = user;
            req.isAuthenticated = true;
            next();
        } catch (error) {
            console.error('Token doğrulama hatası:', error);

            // Geliştirme modundaysa, token hatasını görmezden gel
            if (isDevelopment) {
                console.log('⚠️ DEV MODU: Token hatası görmezden geliniyor, test kullanıcısı oluşturuluyor');
                req.user = {
                    _id: 'token-error-user',
                    role: UserRole.BUSINESS_ADMIN,
                    name: 'Token Hata Kullanıcısı',
                    email: 'tokenerror@example.com',
                    business: req.params.businessId || req.query.businessId
                };
                req.isAuthenticated = true;
                return next();
            }

            return res.status(401).json({
                success: false,
                message: 'Geçersiz token, lütfen tekrar giriş yapın'
            });
        }
    } catch (error) {
        console.error('Light auth middleware genel hata:', error);

        // Geliştirme modunda mı?
        const isDevelopment = process.env.NODE_ENV === 'development';

        if (isDevelopment) {
            console.log('⚠️ DEV MODU: Genel hata görmezden geliniyor');
            req.user = {
                _id: 'error-recovery-user',
                role: UserRole.SUPER_ADMIN,
                name: 'Hata Kurtarma Kullanıcısı',
                email: 'errorrecovery@example.com'
            };
            req.isAuthenticated = true;
            return next();
        }

        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
}; 