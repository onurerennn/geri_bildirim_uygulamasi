import { Request, Response } from 'express';
import Business, { IBusiness } from '../models/Business';
import User, { IUser } from '../models/User';
import { UserRole } from '../types/UserRole';
import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// İşletmeleri listele
export const getBusinesses = async (req: Request, res: Response) => {
    try {
        console.log('İşletmeler getiriliyor...');
        console.log('Kullanıcı:', (req.user as IUser)?.email || 'Bilinmiyor');

        const businesses = await Business.find()
            .select('-password')
            .populate('approvedBy', 'name email');

        console.log('İşletmeler başarıyla getirildi:', businesses.length);
        console.log('İşletme örneği:', businesses[0] || 'Hiç işletme yok');

        // Doğrudan businesses dizisini döndür (önceki versiyon ile uyumluluk için)
        res.status(200).json(businesses);
    } catch (error: any) {
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
};

// İşletme detayını getir
export const getBusiness = async (req: Request, res: Response) => {
    try {
        const business = await Business.findById(req.params.id).populate('approvedBy', 'name');
        if (!business) {
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }
        res.json(business);
    } catch (error) {
        res.status(500).json({ message: 'İşletme getirilirken bir hata oluştu.' });
    }
};

// Yeni işletme oluştur
export const createBusiness = async (req: Request, res: Response) => {
    try {
        console.log('---------------------------------------');
        console.log('İŞLETME OLUŞTURMA İSTEĞİ ALINDI');
        console.log('URL:', req.originalUrl);
        console.log('HTTP Metodu:', req.method);
        console.log('İstek Gövdesi:', req.body);
        console.log('İstek Headers:', req.headers);

        const user = req.user as IUser;
        console.log('Kullanıcı Bilgileri:', {
            id: user?._id,
            email: user?.email,
            role: user?.role
        });

        // Kullanıcı kontrolü
        if (!user || user.role !== UserRole.SUPER_ADMIN) {
            console.error('YETKİ HATASI:', user?.role || 'Kullanıcı bilgisi yok');
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
        const existingBusiness = await Business.findOne({ email });
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
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            console.log('Şifre Hashlendi');

            // İşletme oluşturma
            const business = new Business({
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

            console.log('Oluşturulacak İşletme Modeli:', {
                ...business.toObject(),
                password: '***'
            });

            await business.save();
            console.log('İŞLETME KAYDEDİLDİ:', business._id.toString());

            try {
                // İşletme admin kullanıcısını oluştur
                const businessAdmin = await User.create({
                    name: `${name} Admin`,
                    email,
                    password: hashedPassword,
                    role: UserRole.BUSINESS_ADMIN,
                    business: business._id
                });

                console.log('İŞLETME ADMIN HESABI OLUŞTURULDU:', {
                    id: businessAdmin._id,
                    email: businessAdmin.email,
                    role: businessAdmin.role
                });
            } catch (adminError: any) {
                console.error('ADMIN OLUŞTURMA HATASI:', adminError.message);
                // Admin oluşturulamasa bile işletmeyi silmiyoruz, sadece hata loglanıyor
            }

            // Populate approvedBy alanı
            await business.populate('approvedBy', 'name email');

            // Şifreyi response'dan çıkar
            const businessObj = business.toObject();
            // Type assertion ile password özelliğini güvenli bir şekilde sil
            const businessWithPassword = businessObj as { password?: string };
            delete businessWithPassword.password;

            console.log('İŞLETME BAŞARIYLA OLUŞTURULDU');
            console.log('---------------------------------------');

            res.status(201).json({
                success: true,
                message: 'İşletme ve admin hesabı başarıyla oluşturuldu.',
                business: businessWithPassword
            });
        } catch (innerError: any) {
            console.error('İŞLEM HATASI:', innerError.message);
            console.error('STACK:', innerError.stack);
            throw innerError; // Dış catch bloğuna yönlendir
        }
    } catch (error: any) {
        console.error('İŞLETME OLUŞTURMA GENEL HATASI:', error.message);
        console.error('STACK:', error.stack);
        console.log('---------------------------------------');

        res.status(500).json({
            success: false,
            message: 'İşletme oluşturulurken bir hata oluştu.',
            error: error.message
        });
    }
};

// İşletme güncelle
export const updateBusiness = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, address, phone, email, description, logo, isActive, password } = req.body;

        // Check if business exists
        const business = await Business.findById(id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Check for email conflict if email is being updated
        if (email && email !== business.email) {
            const existingBusiness = await Business.findOne({ email });
            if (existingBusiness) {
                return res.status(400).json({ message: 'Email already in use by another business' });
            }
        }

        // Update fields
        const updateData: Partial<IBusiness> = {};
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (phone) updateData.phone = phone;
        if (email) updateData.email = email;
        if (description !== undefined) updateData.description = description;
        if (logo !== undefined) updateData.logo = logo;
        if (isActive !== undefined) updateData.isActive = isActive;

        // Hash password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedBusiness = await Business.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).select('-password');

        return res.status(200).json(updatedBusiness);
    } catch (error) {
        console.error('Error updating business:', error);
        return res.status(500).json({ message: 'Error updating business', error });
    }
};

// İşletme sil
export const deleteBusiness = async (req: Request, res: Response) => {
    try {
        console.log(`İşletme silme isteği alındı. ID: ${req.params.id}`);

        // İşletmeyi bul
        const business = await Business.findById(req.params.id);
        if (!business) {
            console.log('İşletme bulunamadı:', req.params.id);
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }

        console.log(`İşletme bulundu. İşletme adı: ${business.name}, ID: ${business._id}`);

        // İlişkili kullanıcıları sil
        console.log(`İşletmeye bağlı kullanıcılar siliniyor...`);
        const usersDeleteResult = await User.deleteMany({ business: business._id });
        console.log(`Silinen kullanıcı sayısı: ${usersDeleteResult.deletedCount}`);

        // Mongoose modelleri doğrudan burada import edilmediği için dinamik olarak import edelim
        try {
            // İlişkili anketleri sil
            console.log(`İşletmeye bağlı anketler siliniyor...`);
            const Survey = mongoose.model('Survey');
            const surveysDeleteResult = await Survey.deleteMany({ business: business._id });
            console.log(`Silinen anket sayısı: ${surveysDeleteResult.deletedCount}`);

            // İlişkili QR kodları sil
            console.log(`İşletmeye bağlı QR kodlar siliniyor...`);
            const QRCode = mongoose.model('QRCode');
            const qrCodesDeleteResult = await QRCode.deleteMany({ business: business._id });
            console.log(`Silinen QR kod sayısı: ${qrCodesDeleteResult.deletedCount}`);

            // İlişkili ödülleri sil
            console.log(`İşletmeye bağlı ödüller siliniyor...`);
            const Reward = mongoose.model('Reward');
            const rewardsDeleteResult = await Reward.deleteMany({ businessId: business._id });
            console.log(`Silinen ödül sayısı: ${rewardsDeleteResult.deletedCount}`);

            // İlişkili yanıtları sil
            console.log(`İşletmeye bağlı yanıtlar siliniyor...`);
            const Response = mongoose.model('Response');
            const responsesDeleteResult = await Response.deleteMany({ business: business._id });
            console.log(`Silinen yanıt sayısı: ${responsesDeleteResult.deletedCount}`);
        } catch (modelError) {
            console.error('İlişkili verileri silerken hata:', modelError);
            // İşleme devam et - model bulunamasa bile işletmeyi silmeye çalışacağız
        }

        // İşletmeyi sil
        console.log(`İşletme siliniyor...`);
        await Business.findByIdAndDelete(req.params.id);
        console.log(`İşletme başarıyla silindi: ${business._id}`);

        res.json({
            message: 'İşletme ve tüm ilişkili veriler başarıyla silindi.',
            deletedBusinessId: business._id
        });
    } catch (error: any) {
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
};

// İşletme onayla
export const approveBusiness = async (req: Request, res: Response) => {
    try {
        const requestingUser = req.user as IUser;
        if (requestingUser.role !== UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'İşletme onaylama yetkiniz yok.' });
        }

        const business = await Business.findById(req.params.id);
        if (!business) {
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }

        business.isApproved = true;
        business.approvedBy = requestingUser._id;

        await business.save();
        res.json({ message: 'İşletme başarıyla onaylandı.', business });
    } catch (error) {
        res.status(500).json({ message: 'İşletme onaylanırken bir hata oluştu.' });
    }
};

// BUSINESS_ADMIN ekle
export const addBusinessAdmin = async (req: Request, res: Response) => {
    try {
        const user = req.user as IUser;
        const businessId = req.params.id;

        // SUPER_ADMIN kontrolü
        if (user.role !== UserRole.SUPER_ADMIN) {
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
        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'İşletme bulunamadı.'
            });
        }

        // Email kontrolü
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Bu e-posta adresi zaten kullanımda.'
            });
        }

        // BUSINESS_ADMIN kullanıcısını oluştur
        const businessAdmin = new User({
            name,
            email,
            password,
            role: UserRole.BUSINESS_ADMIN,
            business: business._id,
            isActive: true
        });

        await businessAdmin.save();

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

    } catch (error: any) {
        console.error('İşletme admin oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İşletme admin hesabı oluşturulurken bir hata oluştu.',
            error: error.message
        });
    }
};

// @desc    Create a default business (for development)
// @route   POST /api/businesses/create-default
// @access  Public (only for development)
export const createDefaultBusiness = async (req: Request, res: Response) => {
    try {
        console.log('Creating default business...');

        // Check if a default business already exists
        const existingBusiness = await Business.findOne({ name: 'Demo İşletme' });

        if (existingBusiness) {
            console.log('Default business already exists:', existingBusiness._id);
            return res.status(200).json({
                success: true,
                message: 'Default business already exists',
                businessId: existingBusiness._id
            });
        }

        // Create a default business
        const defaultBusiness = new Business({
            name: 'Demo İşletme',
            address: 'Demo Adres 123',
            phone: '5555555555',
            email: 'demo@example.com',
            description: 'Bu işletme geliştirme amaçlı otomatik oluşturulmuştur',
            isActive: true,
            isApproved: true
        });

        await defaultBusiness.save();
        console.log('Default business created with ID:', defaultBusiness._id);

        return res.status(201).json({
            success: true,
            message: 'Default business created successfully',
            businessId: defaultBusiness._id
        });
    } catch (error: any) {
        console.error('Error creating default business:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create default business',
            error: error.message
        });
    }
}; 