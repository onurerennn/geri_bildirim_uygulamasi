import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { UserRole } from '../types/UserRole';

// JWT token'ı için interface
interface DecodedToken {
    id: string;
}

// Express Request interface'ini genişletme
declare global {
    namespace Express {
        interface Request {
            user?: any;
            isAuthenticated?: boolean;
        }
    }
}

// Kullanıcı kimlik doğrulama middleware'i
export const protect = async (req: Request, res: Response, next: NextFunction) => {
    console.log('Auth middleware başlatıldı, endpoint:', req.originalUrl);
    console.log('Headers:', JSON.stringify({
        authorization: req.headers.authorization,
        cookie: req.headers.cookie
    }, null, 2));

    try {
        let token;

        // Token'ı header'dan alma
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            console.log('Token Authorization header\'dan alındı:', token.substring(0, 20) + '...');
        }
        // Alternatif olarak cookie'den de alabiliriz
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
            console.log('Token cookie\'den alındı:', token.substring(0, 20) + '...');
        }

        // Token yoksa
        if (!token) {
            console.warn('Token bulunamadı, kimlik doğrulama başarısız');
            return res.status(401).json({
                success: false,
                message: 'Bu işlem için giriş yapmanız gerekiyor'
            });
        }

        console.log('Token doğrulanıyor:', token.substring(0, 20) + '...');

        try {
            // Token doğrulama
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizlianahtar') as DecodedToken;

            if (!decoded || !decoded.id) {
                console.error('Token doğrulanamadı veya ID bulunamadı');
                return res.status(401).json({
                    success: false,
                    message: 'Geçersiz token formatı'
                });
            }

            console.log('Token doğrulandı, kullanıcı aranıyor. ID:', decoded.id);

            // Kullanıcıyı bulma
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                console.error('Kullanıcı bulunamadı, ID:', decoded.id);
                return res.status(401).json({
                    success: false,
                    message: 'Kullanıcı bulunamadı'
                });
            }

            // BUSINESS_ADMIN rolündeki kullanıcılar için işletme bilgisini kontrol et
            if (user.role === UserRole.BUSINESS_ADMIN) {
                console.log('BUSINESS_ADMIN kullanıcısı, işletme bilgisi kontrol ediliyor');

                if (!user.business) {
                    console.warn('BUSINESS_ADMIN kullanıcısının işletme bilgisi yok:', user._id);

                    // İşletme bulunamadı, varsayılan bir işletme arayalım
                    try {
                        // Sistemdeki ilk aktif işletmeyi bulalım
                        const defaultBusiness = await require('../models/Business').default.findOne({ isActive: true });

                        if (defaultBusiness) {
                            console.log('Varsayılan işletme bulundu, kullanıcıya atanıyor:', defaultBusiness._id);

                            // Kullanıcıya işletme ID'sini atayalım ve kaydedelim
                            user.business = defaultBusiness._id;
                            await User.findByIdAndUpdate(user._id, { business: defaultBusiness._id });

                            console.log('Kullanıcıya işletme atandı:', {
                                userId: user._id,
                                businessId: defaultBusiness._id,
                                businessName: defaultBusiness.name
                            });
                        } else {
                            console.warn('Varsayılan işletme bulunamadı. İşletme oluşturulmalı.');
                        }
                    } catch (businessError) {
                        console.error('İşletme atama hatası:', businessError);
                    }
                } else {
                    console.log('İşletme bilgisi mevcut:', user.business);
                }
            }

            console.log('Kullanıcı doğrulandı:', {
                id: user._id,
                email: user.email,
                role: user.role,
                business: user.business
            });

            // Kullanıcıyı request'e ekleme
            req.user = user;
            req.isAuthenticated = true;
            next();
        } catch (error: any) {
            console.error('Auth middleware hatası:', error.message);
            console.error('Hata detayları:', error);

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Geçersiz token formatı'
                });
            } else if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token süresi doldu, lütfen tekrar giriş yapın'
                });
            }

            return res.status(401).json({
                success: false,
                message: 'Kimlik doğrulama başarısız',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Doğrulama hatası'
            });
        }
    } catch (error: any) {
        console.error('Auth middleware hatası:', error.message);
        console.error('Hata detayları:', error);

        return res.status(401).json({
            success: false,
            message: 'Kimlik doğrulama başarısız',
            error: process.env.NODE_ENV === 'development' ? error.message : 'İşlem hatası'
        });
    }
};

// Admin yetki kontrolü
export const authorize = (...roles: UserRole[] | UserRole[][]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Flatten roles array in case nested arrays are passed
            const flattenedRoles = roles.flat();
            console.log('Yetki kontrolü, gereken roller:', flattenedRoles);

            if (!req.user) {
                console.error('Yetki kontrolü: Kullanıcı bilgisi bulunamadı');
                return res.status(401).json({
                    success: false,
                    message: 'Giriş yapmanız gerekiyor'
                });
            }

            console.log('Kullanıcı rolü:', req.user.role, 'Gereken roller:', flattenedRoles);

            if (!flattenedRoles.includes(req.user.role)) {
                console.error('Yetki kontrolü başarısız. Kullanıcı rolü:', req.user.role, 'Gereken roller:', flattenedRoles);
                return res.status(403).json({
                    success: false,
                    message: 'Bu işlemi gerçekleştirmek için yetkiniz yok'
                });
            }

            console.log('Yetki kontrolü başarılı, işlem devam ediyor');
            next();
        } catch (error: any) {
            console.error('Yetki kontrolü hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Yetkilendirme işlemi sırasında bir hata oluştu',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Yetkilendirme hatası'
            });
        }
    };
}; 