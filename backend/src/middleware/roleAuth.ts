import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/enums';

export const checkRole = (roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }

        next();
    };
};

export const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
        return res.status(403).json({ message: 'Forbidden: Super Admin access required' });
    }
    next();
};

export const isBusinessAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== UserRole.BUSINESS_ADMIN) {
        return res.status(403).json({ message: 'Forbidden: Business Admin access required' });
    }
    next();
};

export const isAdminOrSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || ![UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN].includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    next();
}; 