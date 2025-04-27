const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// MongoDB bağlantı bilgileri
const MONGO_URI = 'mongodb://127.0.0.1:27017/feedback-app';
const MONGO_DB_NAME = 'feedback-app';
const USERS_COLLECTION = 'users';

// Super Admin kullanıcı bilgileri
const SUPER_ADMIN = {
    name: 'Super Admin',
    email: 'onurerenejder36@gmail.com',
    password: 'ejder3636',
    role: 'SUPER_ADMIN',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
};

console.log('Script başlatılıyor...');
console.log('MongoDB URI:', MONGO_URI);
console.log('Database:', MONGO_DB_NAME);
console.log('Super Admin bilgileri:', SUPER_ADMIN.email);

// Tam olarak Mongoose'un User.ts modelindeki aynı şifre hashleme yöntemi:
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

async function createSuperAdmin() {
    let client;

    try {
        console.log('MongoDB bağlantısı kuruluyor...');
        client = new MongoClient(MONGO_URI);
        await client.connect();
        console.log('MongoDB bağlantısı başarılı');

        const db = client.db(MONGO_DB_NAME);
        const usersCollection = db.collection(USERS_COLLECTION);

        // Koleksiyon içeriğini temizleme seçeneği 
        // DIKKAT: Tüm kullanıcıları siler!
        const shouldDropCollection = false;
        if (shouldDropCollection) {
            console.log('Users koleksiyonu temizleniyor...');
            await db.collection(USERS_COLLECTION).drop().catch(() => console.log('Koleksiyon zaten yok'));
            console.log('Users koleksiyonu temizlendi.');
        }

        // E-posta adresine göre kullanıcı kontrolü
        const existingUser = await usersCollection.findOne({ email: SUPER_ADMIN.email });

        if (existingUser) {
            console.log(`Kullanıcı zaten mevcut (${existingUser._id}). Siliniyor...`);

            // Mevcut kullanıcıyı sil (temiz bir başlangıç için)
            await usersCollection.deleteOne({ email: SUPER_ADMIN.email });
            console.log('Mevcut kullanıcı silindi.');
        }

        console.log('Yeni Super Admin kullanıcısı oluşturuluyor...');

        // Şifreyi hash'le - TAMAMEN User.ts'deki gibi
        const hashedPassword = await hashPassword(SUPER_ADMIN.password);
        console.log('Şifre hash\'lendi:', hashedPassword.slice(0, 10) + '...');

        // Kullanıcı verisini hazırla
        const userData = {
            ...SUPER_ADMIN,
            password: hashedPassword
        };

        // Kullanıcıyı oluştur
        const result = await usersCollection.insertOne(userData);
        console.log('Yeni Super Admin kullanıcısı oluşturuldu:', result.insertedId);

        // Kontrol için kullanıcıyı tekrar sorgula ve göster
        const createdUser = await usersCollection.findOne({ _id: result.insertedId });
        console.log('Oluşturulan kullanıcı:', {
            _id: createdUser._id,
            name: createdUser.name,
            email: createdUser.email,
            role: createdUser.role,
            passwordLength: createdUser.password.length,
            passwordStart: createdUser.password.substring(0, 10) + '...'
        });

        // Login işlemi simülasyonu
        console.log('Giriş simülasyonu gerçekleştiriliyor...');
        // 1. E-posta ile kullanıcıyı bul
        const userForLogin = await usersCollection.findOne({ email: SUPER_ADMIN.email });
        if (!userForLogin) {
            throw new Error('Kullanıcı bulunamadı!');
        }

        // 2. Şifre karşılaştırmasını simüle et
        const isPasswordValid = await bcrypt.compare(SUPER_ADMIN.password, userForLogin.password);
        console.log('Şifre doğrulama sonucu:', isPasswordValid ? 'BAŞARILI' : 'BAŞARISIZ');

        if (isPasswordValid) {
            console.log('Simülasyon: Giriş başarılı');
        } else {
            console.log('Simülasyon: Giriş başarısız - Şifre yanlış');
            console.log('Doğru şifre:', SUPER_ADMIN.password);
            console.log('DB\'deki Hash:', userForLogin.password);
        }

        console.log('-------------------------------');
        console.log('İşlem tamamlandı!');
        console.log('Super Admin kullanıcısı oluşturuldu.');
        console.log('-------------------------------');
        console.log('Giriş bilgileri:');
        console.log(`Email: ${SUPER_ADMIN.email}`);
        console.log(`Şifre: ${SUPER_ADMIN.password}`);
        console.log('-------------------------------');
        console.log('İpucu: Backend ve frontend uygulamalarını yeniden başlatmayı unutmayın.');

    } catch (error) {
        console.error('HATA:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB bağlantısı kapatıldı');
        }
    }
}

// Scripti çalıştır
createSuperAdmin(); 