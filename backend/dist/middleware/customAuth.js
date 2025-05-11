"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flexibleRoleCheck = exports.debugRoleCheck = exports.checkBusinessAdminOrSuperAdmin = void 0;
/**
 * İşletme admini veya super admin kontrolü yapan middleware
 * Kullanıcı rolünü büyük-küçük harf duyarsız şekilde kontrol eder
 */
const checkBusinessAdminOrSuperAdmin = (req, res, next) => {
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
        // Kullanıcı ID'sine dayalı bir business ID oluştur
        req.user.business = `business_${req.user.id}`;
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
        return res.status(403).json({
            success: false,
            message: 'Bu özelliği kullanmanız için işletme admini olmanız gerekmektedir.'
        });
    }
    console.log('✅ Rol kontrolü başarılı, işlem devam ediyor');
    next();
};
exports.checkBusinessAdminOrSuperAdmin = checkBusinessAdminOrSuperAdmin;
/**
 * Debug modunda rol kontrolü yapan middleware
 * Hata vermez, sadece kullanıcı bilgilerini loglar ve geçer
 * Geliştirme aşamasında kullanılabilir
 */
const debugRoleCheck = (req, res, next) => {
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
    }
    else {
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
exports.debugRoleCheck = debugRoleCheck;
/**
 * Esnek rol kontrolü - geliştirme veya test aşamasında
 * Rol standart kontrolden geçemese bile belirli koşullarda izin verir
 */
const flexibleRoleCheck = (req, res, next) => {
    console.log('🔄 Esnek rol kontrolü yapılıyor');
    if (!req.user) {
        console.log('⚠️ Kullanıcı bilgisi bulunamadı, kullanıcı olmadan devam edilemiyor');
        return res.status(401).json({
            success: false,
            message: 'Bu işlemi yapmak için giriş yapmalısınız'
        });
    }
    // Business ID atama kontrolü - BUSINESS_ADMIN kullanıcıları için
    if (String(req.user.role || '').toUpperCase().includes('ADMIN') && !req.user.business && req.user.id) {
        req.user.business = `business_${req.user.id}`;
        console.log('✅ Esnek mod: Otomatik business ID atandı:', req.user.business);
    }
    // Normal rol kontrolü
    const userRole = String(req.user.role || '').toUpperCase();
    const allowedRoles = ['BUSINESS_ADMIN', 'SUPER_ADMIN', 'ADMIN'];
    if (allowedRoles.some(role => userRole.includes(role))) {
        console.log('✅ Standart rol kontrolü başarılı');
        return next();
    }
    console.log('⚠️ Standart rol kontrolü başarısız, alternatif kontroller deneniyor');
    // E-posta adresi belirli bir alan adını içeriyorsa izin ver
    if (req.user.email && (req.user.email.endsWith('@example.com') ||
        req.user.email.includes('admin') ||
        req.user.email.includes('test'))) {
        console.log('✅ E-posta adresine göre izin verildi:', req.user.email);
        return next();
    }
    // Kullanıcı ID'si varsa izin ver (geliştirme/test aşaması için)
    if (req.user.id) {
        console.log('✅ Test/geliştirme modu - kullanıcı ID kontrolü ile geçiş yapılıyor');
        console.log('⚠️ NOT: Bu yalnızca test/geliştirme aşamasında kullanılmalıdır!');
        return next();
    }
    // Hiçbir koşul karşılanmadıysa erişimi reddet
    console.log('❌ Tüm esneklik kontrolleri başarısız, erişim reddedildi');
    return res.status(403).json({
        success: false,
        message: 'Bu özelliği kullanmak için gerekli yetkiye sahip değilsiniz'
    });
};
exports.flexibleRoleCheck = flexibleRoleCheck;
