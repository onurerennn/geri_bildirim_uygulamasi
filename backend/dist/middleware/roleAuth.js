"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminOrSuperAdmin = exports.isBusinessAdmin = exports.isSuperAdmin = exports.checkRole = void 0;
const UserRole_1 = require("../types/UserRole");
const checkRole = (roles) => {
    return (req, res, next) => {
        var _a;
        try {
            console.log('Role check for user:', {
                userRole: (_a = req.user) === null || _a === void 0 ? void 0 : _a.role,
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
        }
        catch (error) {
            console.error('Role check error:', error);
            return res.status(500).json({ message: 'Internal server error during role check' });
        }
    };
};
exports.checkRole = checkRole;
const isSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== UserRole_1.UserRole.SUPER_ADMIN) {
        return res.status(403).json({ message: 'Forbidden: Super Admin access required' });
    }
    next();
};
exports.isSuperAdmin = isSuperAdmin;
const isBusinessAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== UserRole_1.UserRole.BUSINESS_ADMIN) {
        return res.status(403).json({ message: 'Forbidden: Business Admin access required' });
    }
    next();
};
exports.isBusinessAdmin = isBusinessAdmin;
const isAdminOrSuperAdmin = (req, res, next) => {
    if (!req.user || ![UserRole_1.UserRole.SUPER_ADMIN, UserRole_1.UserRole.BUSINESS_ADMIN].includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    next();
};
exports.isAdminOrSuperAdmin = isAdminOrSuperAdmin;
