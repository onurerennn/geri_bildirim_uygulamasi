import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import { UserRole } from '../types/UserRole';

// Kullanıcıları listele
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcılar listelenirken bir hata oluştu.' });
    }
};

// Kullanıcı detayını getir
export const getUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcı getirilirken bir hata oluştu.' });
    }
};

// Yeni kullanıcı oluştur
export const createUser = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body;

        // E-posta kontrolü
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
        }

        // Rol kontrolü
        const requestingUser = req.user as IUser;
        if (requestingUser.role !== UserRole.SUPER_ADMIN && role === UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Super Admin rolü atama yetkiniz yok.' });
        }

        if (requestingUser.role === UserRole.BUSINESS_ADMIN && role !== UserRole.CUSTOMER) {
            return res.status(403).json({ message: 'Sadece müşteri rolü atayabilirsiniz.' });
        }

        const user = new User({
            name,
            email,
            password,
            role,
            business: role === UserRole.BUSINESS_ADMIN ? req.body.business : undefined
        });

        await user.save();
        res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.', user });
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcı oluşturulurken bir hata oluştu.' });
    }
};

// Kullanıcı güncelle
export const updateUser = async (req: Request, res: Response) => {
    try {
        const { name, email, role, isActive } = req.body;
        const userId = req.params.id;

        // Kullanıcı kontrolü
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // Rol kontrolü
        const requestingUser = req.user as IUser;
        if (requestingUser.role !== UserRole.SUPER_ADMIN && role === UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Super Admin rolü atama yetkiniz yok.' });
        }

        if (requestingUser.role === UserRole.BUSINESS_ADMIN && role !== UserRole.CUSTOMER) {
            return res.status(403).json({ message: 'Sadece müşteri rolü atayabilirsiniz.' });
        }

        // E-posta değişikliği varsa kontrol et
        if (email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
            }
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
        user.isActive = isActive !== undefined ? isActive : user.isActive;

        if (role === UserRole.BUSINESS_ADMIN) {
            user.business = req.body.business;
        }

        await user.save();
        res.json({ message: 'Kullanıcı başarıyla güncellendi.', user });
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcı güncellenirken bir hata oluştu.' });
    }
};

// Kullanıcı sil
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const requestingUser = req.user as IUser;

        // Kullanıcı kontrolü
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // Rol kontrolü
        if (requestingUser.role === UserRole.BUSINESS_ADMIN && user.role !== UserRole.CUSTOMER) {
            return res.status(403).json({ message: 'Sadece müşteri rolündeki kullanıcıları silebilirsiniz.' });
        }

        if (user.role === UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Super Admin kullanıcıları silinemez.' });
        }

        await User.findByIdAndDelete(userId);
        res.json({ message: 'Kullanıcı başarıyla silindi.' });
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcı silinirken bir hata oluştu.' });
    }
}; 