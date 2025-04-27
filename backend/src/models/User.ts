import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../types/UserRole';

export interface IUser extends mongoose.Document {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    business?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    toJSON(): any;
}

const userSchema = new mongoose.Schema<IUser>(
    {
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
            enum: Object.values(UserRole),
            default: UserRole.CUSTOMER
        },
        isActive: {
            type: Boolean,
            default: true
        },
        business: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Business'
        }
    },
    {
        timestamps: true
    }
);

// Şifre hashleme middleware
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error: any) {
        next(error);
    }
});

// Şifre karşılaştırma metodu
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    try {
        console.log('comparePassword metodu çağrıldı...');
        console.log('Karşılaştırılacak şifre uzunluğu:', candidatePassword?.length || 0);
        console.log('DB şifre hash başlangıcı:', this.password?.substring(0, 10) || 'YOK');

        if (!candidatePassword) {
            console.error('Şifre belirtilmedi');
            return false;
        }

        if (!this.password) {
            console.error('Veritabanında şifre yok');
            return false;
        }

        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        console.log('bcrypt.compare sonucu:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('Şifre karşılaştırma hatası:', error);
        throw new Error('Şifre karşılaştırma hatası');
    }
};

// JSON dönüşümünde hassas verileri kaldır
userSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.__v;
    return userObject;
};

// E-posta benzersizliği için özel hata mesajı
userSchema.post('save', function (error: any, doc: any, next: any) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Bu e-posta adresi zaten kullanılıyor'));
    } else {
        next(error);
    }
});

const User = mongoose.model<IUser>('User', userSchema);

export default User; 