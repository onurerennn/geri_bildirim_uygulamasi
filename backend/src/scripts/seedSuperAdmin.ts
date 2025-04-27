import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';
import { UserRole } from '../types/UserRole';

// Önce .env dosyasını yükle
dotenv.config();

console.log('Super Admin oluşturma scripti başlatılıyor...');
console.log('Kullanılacak MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback-app');

const seedSuperAdmin = async () => {
    try {
        // MongoDB bağlantısı
        console.log('MongoDB bağlantısı kuruluyor...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback-app');
        console.log('MongoDB bağlantısı başarılı');

        // Süper admin kullanıcı bilgileri
        const superAdminData = {
            name: 'Super Admin',
            email: 'onurerenejder36@gmail.com',
            password: 'ejder3636',
            role: UserRole.SUPER_ADMIN,
            isActive: true
        };

        console.log('Oluşturulacak Super Admin bilgileri:', {
            name: superAdminData.name,
            email: superAdminData.email,
            role: superAdminData.role
        });

        // Önce mevcut kullanıcıyı kontrol et
        console.log('Mevcut süper admin kullanıcısı kontrol ediliyor...');
        let existingUser = await User.findOne({ email: superAdminData.email });

        if (existingUser) {
            console.log('Mevcut süper admin kullanıcısı bulundu:', existingUser._id);
            console.log('Kullanıcı bilgileri güncelleniyor...');

            existingUser.name = superAdminData.name;
            existingUser.password = superAdminData.password;
            existingUser.role = superAdminData.role;
            existingUser.isActive = superAdminData.isActive;

            await existingUser.save();
            console.log('Süper admin kullanıcısı başarıyla güncellendi');
        } else {
            console.log('Mevcut süper admin kullanıcısı bulunamadı');
            console.log('Yeni süper admin kullanıcısı oluşturuluyor...');

            const newSuperAdmin = new User(superAdminData);
            const savedAdmin = await newSuperAdmin.save();

            console.log('Süper admin kullanıcısı başarıyla oluşturuldu:', savedAdmin._id);
        }

        // Tüm süper admin kullanıcılarını listele
        const allSuperAdmins = await User.find({ role: UserRole.SUPER_ADMIN }).select('name email role');
        console.log('Sistemdeki tüm süper admin kullanıcıları:', allSuperAdmins);

        // Bağlantıyı kapat ve çık
        await mongoose.connection.close();
        console.log('MongoDB bağlantısı kapatıldı');
        console.log('İşlem başarıyla tamamlandı');

        process.exit(0);
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
};

// Fonksiyonu çağır
seedSuperAdmin(); 