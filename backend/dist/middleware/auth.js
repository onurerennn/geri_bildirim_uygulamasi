"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let token;
        // Token'ı header'dan veya cookie'den al
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        else if ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token) {
            token = req.cookies.token;
        }
        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }
        try {
            // Token'ı doğrula
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'gizlianahtar');
            // Kullanıcıyı bul
            const user = yield User_1.default.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }
            req.user = user;
            next();
        }
        catch (error) {
            console.error('Token doğrulama hatası:', error);
            return res.status(401).json({ message: 'Not authorized, invalid token' });
        }
    }
    catch (error) {
        console.error('Auth middleware hatası:', error);
        return res.status(500).json({ message: 'Server error in auth middleware' });
    }
});
exports.protect = protect;
const admin = (req, res, next) => {
    if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'BUSINESS_ADMIN')) {
        next();
    }
    else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};
exports.admin = admin;
