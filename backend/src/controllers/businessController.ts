import { Request, Response } from 'express';
import Business, { IBusiness } from '../models/Business';
import { UserRole } from '../types/UserRole';
import { IUser } from '../models/User';

// İşletmeleri listele
export const getBusinesses = async (req: Request, res: Response) => {
    try {
        const businesses = await Business.find().populate('approvedBy', 'name');
        res.json(businesses);
    } catch (error) {
        res.status(500).json({ message: 'İşletmeler listelenirken bir hata oluştu.' });
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
        const { name, address, phone, email, description, logo } = req.body;

        // E-posta kontrolü
        const existingBusiness = await Business.findOne({ email });
        if (existingBusiness) {
            return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
        }

        const business = new Business({
            name,
            address,
            phone,
            email,
            description,
            logo,
            isApproved: false,
            isActive: true,
        });

        await business.save();
        res.status(201).json({ message: 'İşletme başarıyla oluşturuldu.', business });
    } catch (error) {
        res.status(500).json({ message: 'İşletme oluşturulurken bir hata oluştu.' });
    }
};

// İşletme güncelle
export const updateBusiness = async (req: Request, res: Response) => {
    try {
        const { name, address, phone, email, description, logo, isActive } = req.body;
        const businessId = req.params.id;

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }

        // E-posta değişikliği varsa kontrol et
        if (email !== business.email) {
            const existingBusiness = await Business.findOne({ email });
            if (existingBusiness) {
                return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
            }
        }

        business.name = name || business.name;
        business.address = address || business.address;
        business.phone = phone || business.phone;
        business.email = email || business.email;
        business.description = description || business.description;
        if (logo) business.logo = logo;
        if (isActive !== undefined) business.isActive = isActive;

        await business.save();
        res.json({ message: 'İşletme başarıyla güncellendi.', business });
    } catch (error) {
        res.status(500).json({ message: 'İşletme güncellenirken bir hata oluştu.' });
    }
};

// İşletme sil
export const deleteBusiness = async (req: Request, res: Response) => {
    try {
        const business = await Business.findById(req.params.id);
        if (!business) {
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }

        await Business.findByIdAndDelete(req.params.id);
        res.json({ message: 'İşletme başarıyla silindi.' });
    } catch (error) {
        res.status(500).json({ message: 'İşletme silinirken bir hata oluştu.' });
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