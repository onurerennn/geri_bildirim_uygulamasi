import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// JWT Token oluştur
const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET!, {
        expiresIn: '30d',
    });
};

// @desc    Yeni kullanıcı kaydı oluştur
// @route   POST /api/auth/register
// @access  Herkese açık
export const registerUser = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body;

        // Kullanıcının daha önce kayıt olup olmadığını kontrol et
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
        }

        // Yeni kullanıcı oluştur
        const user = await User.create({
            name,
            email,
            password,
            role,
            isActive: true // Aktif kullanıcı olarak oluştur
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Geçersiz kullanıcı bilgileri' });
        }
    } catch (error) {
        console.error('Kayıt olma hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası oluştu' });
    }
};

// @desc    Kullanıcı girişi ve token alma
// @route   POST /api/auth/login
// @access  Herkese açık
export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // E-posta ile kullanıcıyı bul
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Geçersiz e-posta veya şifre' });
        }
    } catch (error) {
        console.error('Giriş hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası oluştu' });
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