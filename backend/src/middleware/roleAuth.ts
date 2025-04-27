import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/UserRole';

export const checkRole = (roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log('Role check for user:', {
                userRole: req.user?.role,
                requiredRoles: roles,
                user: req.user
            });

            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    message: 'Forbidden: Insufficient permissions',
                    userRole: req.user.role,
                    requiredRoles: roles
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            return res.status(500).json({ message: 'Internal server error during role check' });
        }
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