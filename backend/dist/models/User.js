"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt = __importStar(require("bcryptjs"));
const UserRole_1 = require("../types/UserRole");
const userSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: [true, 'İsim alanı zorunludur'],
        trim: true,
        minlength: [2, 'İsim en az 2 karakter olmalıdır'],
        maxlength: [50, 'İsim en fazla 50 karakter olabilir']
    },
    email: {
        type: String,
        required: [true, 'E-posta alanı zorunludur'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Geçerli bir e-posta adresi giriniz']
    },
    password: {
        type: String,
        required: [true, 'Şifre alanı zorunludur'],
        minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
        select: false
    },
    role: {
        type: String,
        enum: Object.values(UserRole_1.UserRole),
        default: UserRole_1.UserRole.CUSTOMER
    },
    isActive: {
        type: Boolean,
        default: true
    },
    business: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Business'
    }
}, {
    timestamps: true
});
// Şifre hashleme middleware
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified('password')) {
            return next();
        }
        try {
            const salt = yield bcrypt.genSalt(10);
            this.password = yield bcrypt.hash(this.password, salt);
            next();
        }
        catch (error) {
            next(error);
        }
    });
});
// Şifre karşılaştırma metodu
userSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            console.log('comparePassword metodu çağrıldı...');
            console.log('Karşılaştırılacak şifre uzunluğu:', (candidatePassword === null || candidatePassword === void 0 ? void 0 : candidatePassword.length) || 0);
            console.log('DB şifre hash başlangıcı:', ((_a = this.password) === null || _a === void 0 ? void 0 : _a.substring(0, 10)) || 'YOK');
            if (!candidatePassword) {
                console.error('Şifre belirtilmedi');
                return false;
            }
            if (!this.password) {
                console.error('Veritabanında şifre yok');
                return false;
            }
            const isMatch = yield bcrypt.compare(candidatePassword, this.password);
            console.log('bcrypt.compare sonucu:', isMatch);
            return isMatch;
        }
        catch (error) {
            console.error('Şifre karşılaştırma hatası:', error);
            throw new Error('Şifre karşılaştırma hatası');
        }
    });
};
// JSON dönüşümünde hassas verileri kaldır
userSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.__v;
    return userObject;
};
// E-posta benzersizliği için özel hata mesajı
userSchema.post('save', function (error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Bu e-posta adresi zaten kullanılıyor'));
    }
    else {
        next(error);
    }
});
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
