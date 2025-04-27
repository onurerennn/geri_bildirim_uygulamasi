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
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUser = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const UserRole_1 = require("../types/UserRole");
// Kullanıcıları listele
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_1.default.find().select('-password');
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Kullanıcılar listelenirken bir hata oluştu.' });
    }
});
exports.getUsers = getUsers;
// Kullanıcı detayını getir
const getUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Kullanıcı getirilirken bir hata oluştu.' });
    }
});
exports.getUser = getUser;
// Yeni kullanıcı oluştur
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role } = req.body;
        // E-posta kontrolü
        const existingUser = yield User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
        }
        // Rol kontrolü
        const requestingUser = req.user;
        if (requestingUser.role !== UserRole_1.UserRole.SUPER_ADMIN && role === UserRole_1.UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Super Admin rolü atama yetkiniz yok.' });
        }
        if (requestingUser.role === UserRole_1.UserRole.BUSINESS_ADMIN && role !== UserRole_1.UserRole.CUSTOMER) {
            return res.status(403).json({ message: 'Sadece müşteri rolü atayabilirsiniz.' });
        }
        const user = new User_1.default({
            name,
            email,
            password,
            role,
            business: role === UserRole_1.UserRole.BUSINESS_ADMIN ? req.body.business : undefined
        });
        yield user.save();
        res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.', user });
    }
    catch (error) {
        res.status(500).json({ message: 'Kullanıcı oluşturulurken bir hata oluştu.' });
    }
});
exports.createUser = createUser;
// Kullanıcı güncelle
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, role, isActive } = req.body;
        const userId = req.params.id;
        // Kullanıcı kontrolü
        const user = yield User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
        // Rol kontrolü
        const requestingUser = req.user;
        if (requestingUser.role !== UserRole_1.UserRole.SUPER_ADMIN && role === UserRole_1.UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Super Admin rolü atama yetkiniz yok.' });
        }
        if (requestingUser.role === UserRole_1.UserRole.BUSINESS_ADMIN && role !== UserRole_1.UserRole.CUSTOMER) {
            return res.status(403).json({ message: 'Sadece müşteri rolü atayabilirsiniz.' });
        }
        // E-posta değişikliği varsa kontrol et
        if (email !== user.email) {
            const existingUser = yield User_1.default.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
            }
        }
        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
        user.isActive = isActive !== undefined ? isActive : user.isActive;
        if (role === UserRole_1.UserRole.BUSINESS_ADMIN) {
            user.business = req.body.business;
        }
        yield user.save();
        res.json({ message: 'Kullanıcı başarıyla güncellendi.', user });
    }
    catch (error) {
        res.status(500).json({ message: 'Kullanıcı güncellenirken bir hata oluştu.' });
    }
});
exports.updateUser = updateUser;
// Kullanıcı sil
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const requestingUser = req.user;
        // Kullanıcı kontrolü
        const user = yield User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
        // Rol kontrolü
        if (requestingUser.role === UserRole_1.UserRole.BUSINESS_ADMIN && user.role !== UserRole_1.UserRole.CUSTOMER) {
            return res.status(403).json({ message: 'Sadece müşteri rolündeki kullanıcıları silebilirsiniz.' });
        }
        if (user.role === UserRole_1.UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Super Admin kullanıcıları silinemez.' });
        }
        yield User_1.default.findByIdAndDelete(userId);
        res.json({ message: 'Kullanıcı başarıyla silindi.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Kullanıcı silinirken bir hata oluştu.' });
    }
});
exports.deleteUser = deleteUser;
