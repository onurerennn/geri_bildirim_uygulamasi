import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface JwtPayload {
    id: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token;

        // Token'ı header'dan veya cookie'den al
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        try {
            // Token'ı doğrula
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizlianahtar') as JwtPayload;

            // Kullanıcıyı bul
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Token doğrulama hatası:', error);
            return res.status(401).json({ message: 'Not authorized, invalid token' });
        }
    } catch (error) {
        console.error('Auth middleware hatası:', error);
        return res.status(500).json({ message: 'Server error in auth middleware' });
    }
};

export const admin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'BUSINESS_ADMIN')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
}; 