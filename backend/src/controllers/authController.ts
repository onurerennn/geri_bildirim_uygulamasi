import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { UserRole } from '../types/UserRole';
import Business from '../models/Business';
import ResponseModel from '../models/Response';
import mongoose from 'mongoose';

// Token oluşturma fonksiyonu
const generateToken = (id: string | mongoose.Types.ObjectId): string => {
    // ObjectId türünde ise string'e dönüştür
    const idStr = typeof id === 'string' ? id : id.toString();
    return jwt.sign({ id: idStr }, process.env.JWT_SECRET || 'default_secret', {
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
            return res.status(400).json({
                success: false,
                message: 'Email ve şifre alanları zorunludur'
            });
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
                        { id: user._id.toString() },
                        process.env.JWT_SECRET || 'default_secret',
                        { expiresIn: '30d' }
                    );

                    // Şifreyi response'dan kaldır
                    const userData = user.toJSON();

                    // BUSINESS_ADMIN rolü için işletme kontrol et
                    if (user.role === UserRole.BUSINESS_ADMIN && !user.business) {
                        console.log('BUSINESS_ADMIN kullanıcısının işletme bilgisi yok, varsayılan işletme aranıyor...');

                        try {
                            // Sistemdeki ilk aktif işletmeyi bul
                            const defaultBusiness = await Business.findOne({ isActive: true });

                            if (defaultBusiness) {
                                console.log('Varsayılan işletme bulundu, kullanıcıya atanıyor:', defaultBusiness._id);

                                // Kullanıcıya işletme ID'sini ata ve kaydet
                                user.business = defaultBusiness._id;
                                await User.findByIdAndUpdate(user._id, { business: defaultBusiness._id });

                                // userData objesini de güncelle
                                userData.business = defaultBusiness._id;

                                console.log('Kullanıcıya işletme atandı:', {
                                    userId: user._id,
                                    businessId: defaultBusiness._id,
                                    businessName: defaultBusiness.name
                                });
                            } else {
                                console.warn('Varsayılan işletme bulunamadı.');
                            }
                        } catch (businessError) {
                            console.error('İşletme atama hatası:', businessError);
                        }
                    }

                    // Kullanıcının rolüne göre izin kontrolü
                    if (user.role === UserRole.CUSTOMER) {
                        console.log('MÜŞTERİ GİRİŞİ BAŞARILI');
                    } else if (user.role === UserRole.BUSINESS_ADMIN) {
                        console.log('İŞLETME ADMİN GİRİŞİ BAŞARILI');
                    } else if (user.role === UserRole.SUPER_ADMIN) {
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
                            { id: businessAdmin._id.toString() },
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
                            { id: newBusinessAdmin._id.toString() },
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
            return res.status(500).json({
                success: false,
                message: 'Giriş işlemi sırasında bir hata oluştu',
                error: innerError.message
            });
        }
    } catch (error: any) {
        console.error('Giriş işlemi hatası (dış):', error.message);
        console.error('Stack:', error.stack);
        console.log('---------------------------------------');

        return res.status(500).json({
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

// @desc    İşletmeye ait müşterileri getir
// @route   GET /api/users/business/:businessId/customers
// @access  Private - Business Admin
export const getBusinessCustomers = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;

        console.log(`İşletme ID: ${businessId} için müşterileri getirme isteği`);

        // İşletme mevcut mu kontrol et
        const business = await Business.findById(businessId);
        if (!business) {
            console.error(`İşletme bulunamadı: ${businessId}`);
            return res.status(404).json({
                success: false,
                message: 'İşletme bulunamadı'
            });
        }

        console.log(`İşletme bulundu: ${business.name}`);

        // Önce işletmeye ait yanıtları bul
        const responses = await ResponseModel.find({ business: businessId })
            .populate({
                path: 'survey',
                select: 'title description rewardPoints'
            })
            .sort({ createdAt: -1 });

        console.log(`${responses.length} adet yanıt bulundu`);

        // Müşteri bilgilerini toplamak için bir map oluştur - String key kullanacağız
        const customerMap = new Map<string, any>();

        // Her yanıtı işle ve müşteri bilgilerini topla
        for (let index = 0; index < responses.length; index++) {
            try {
                const response = responses[index];

                // Müşteri bilgilerini farklı kaynaklardan topla
                let customerName = '';
                let customerEmail = '';
                let customerId = '';

                // Müşteri bilgilerini al
                if (response.customer) {
                    if (typeof response.customer === 'object') {
                        // Nesne olarak gelen müşteri
                        if (response.customer._id) {
                            customerId = response.customer._id.toString();
                        }
                        customerName = response.customer.name || '';
                        customerEmail = response.customer.email || '';
                    } else if (typeof response.customer === 'string') {
                        // ID olarak gelen müşteri
                        customerId = response.customer;
                    }
                }

                // Veri yoksa diğer alanlardan tamamla
                if (!customerName) {
                    customerName = response.customerName || `Müşteri-${index + 1}`;
                }
                if (!customerEmail) {
                    customerEmail = response.customerEmail || '';
                }

                // Benzersiz bir anahtar oluştur
                // ObjectId'den kaçınmak için string olarak kullan
                const customerKey = customerEmail || customerName || `müşteri-${index}`;

                if (!customerKey) {
                    console.log(`Yanıt #${index} için geçerli müşteri bilgisi bulunamadı, atlanıyor`);
                    continue;  // Geçersiz müşteri, sonraki iterasyona geç
                }

                // Puan bilgisini al
                const rewardPoints = response.rewardPoints ||
                    (response.survey && typeof response.survey === 'object' &&
                        'rewardPoints' in response.survey ? response.survey.rewardPoints : 0);

                // Müşteri daha önce eklenmiş mi kontrol et
                if (!customerMap.has(customerKey)) {
                    // Yeni müşteri ekle - ObjectId kullanmayacağız
                    const customerObj = {
                        _id: customerKey,  // String tabanlı ID kullan, ObjectId'den kaçın
                        name: customerName,
                        email: customerEmail,
                        points: rewardPoints,
                        completedSurveys: 1
                    };

                    customerMap.set(customerKey, customerObj);
                    console.log(`Yeni müşteri eklendi: ${customerName}, Key: ${customerKey}, Puan: ${rewardPoints}`);
                } else {
                    // Mevcut müşteriyi güncelle
                    const customer = customerMap.get(customerKey);
                    const updatedCustomer = {
                        ...customer,
                        points: (customer.points || 0) + rewardPoints,
                        completedSurveys: (customer.completedSurveys || 0) + 1
                    };

                    customerMap.set(customerKey, updatedCustomer);
                    console.log(`Müşteri güncellendi: ${customerName}, Toplam puan: ${updatedCustomer.points}`);
                }
            } catch (err) {
                console.error(`Yanıt #${index} işlenirken hata oluştu:`, err);
                // Hata oluştuğunda döngüyü kesme, diğer yanıtları işlemeye devam et
            }
        }

        console.log(`${customerMap.size} eşsiz müşteri bulundu`);

        // Müşteri haritasını diziye dönüştür
        const customers = Array.from(customerMap.values());

        // Kontrol amaçlı ilk müşteriyi logla
        if (customers.length > 0) {
            console.log('İlk müşteri örneği:', JSON.stringify(customers[0], null, 2));
        }

        return res.status(200).json({
            success: true,
            data: customers
        });
    } catch (error: any) {
        console.error('İşletme müşterilerini getirme hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Müşteri listesi getirilirken bir hata oluştu',
            error: error.message
        });
    }
}; 