const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// MongoDB bağlantı bilgileri - backend'in kullandığı ile aynı olmalı
// NOT: backend/.env dosyasında tanımlı olan MONGO_URI değerini kullanın
const MONGO_URI = 'mongodb://127.0.0.1:27017/feedback-app';
const MONGO_DB_NAME = 'feedback-app';
const USERS_COLLECTION = 'users'; // Model adı "User" olduğu için MongoDB'de "users" koleksiyonu olacak

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
console.log('Koleksiyon:', USERS_COLLECTION);
console.log('Super Admin bilgileri:', {
    name: SUPER_ADMIN.name,
    email: SUPER_ADMIN.email,
    role: SUPER_ADMIN.role
});

async function createSuperAdmin() {
    let client;

    try {
        console.log('MongoDB bağlantısı kuruluyor...');
        client = new MongoClient(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        await client.connect();
        console.log('MongoDB bağlantısı başarılı');

        const db = client.db(MONGO_DB_NAME);

        // Veritabanındaki tüm koleksiyonları listele
        console.log('Veritabanındaki koleksiyonlar listeleniyor...');
        const collections = await db.listCollections().toArray();
        console.log('Mevcut koleksiyonlar:', collections.map(c => c.name));

        const usersCollection = db.collection(USERS_COLLECTION);

        // Koleksiyonun varlığını kontrol et
        const collectionExists = collections.some(c => c.name === USERS_COLLECTION);
        if (!collectionExists) {
            console.log(`'${USERS_COLLECTION}' koleksiyonu bulunamadı. Oluşturuluyor...`);
            await db.createCollection(USERS_COLLECTION);
            console.log(`'${USERS_COLLECTION}' koleksiyonu oluşturuldu.`);
        }

        // E-posta adresine göre kullanıcı kontrolü
        const existingUser = await usersCollection.findOne({ email: SUPER_ADMIN.email });
        console.log('Kullanıcı sorgusu sonucu:', existingUser ? 'Kullanıcı bulundu' : 'Kullanıcı bulunamadı');

        if (existingUser) {
            console.log(`Kullanıcı zaten mevcut (ID: ${existingUser._id}). Güncelleniyor...`);

            // Şifreyi hash'le
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, salt);

            // Kullanıcıyı güncelle
            const result = await usersCollection.updateOne(
                { email: SUPER_ADMIN.email },
                {
                    $set: {
                        name: SUPER_ADMIN.name,
                        password: hashedPassword,
                        role: SUPER_ADMIN.role,
                        isActive: SUPER_ADMIN.isActive,
                        updatedAt: new Date()
                    }
                }
            );

            console.log('Kullanıcı güncellendi:', result);
        } else {
            console.log('Yeni Super Admin kullanıcısı oluşturuluyor...');

            // Şifreyi hash'le
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, salt);

            // Kullanıcı verisini hazırla
            const userData = {
                ...SUPER_ADMIN,
                password: hashedPassword
            };

            // Kullanıcıyı oluştur
            const result = await usersCollection.insertOne(userData);

            console.log('Super Admin kullanıcısı oluşturuldu:', result.insertedId);
        }

        // Tüm kullanıcıları kontrol et
        console.log('Tüm kullanıcıları listeliyorum...');
        const allUsers = await usersCollection.find().toArray();
        console.log(`Toplam ${allUsers.length} kullanıcı bulundu.`);

        if (allUsers.length > 0) {
            console.log('Kullanıcı örnekleri:');
            allUsers.slice(0, 3).forEach((user, index) => {
                console.log(`${index + 1}. Kullanıcı:`, {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                });
            });
        }

        // Tüm süper admin kullanıcılarını listele
        const superAdmins = await usersCollection.find({ role: 'SUPER_ADMIN' }).toArray();
        console.log(`Sistemde ${superAdmins.length} Super Admin kullanıcı bulundu:`);
        superAdmins.forEach(admin => {
            console.log(`- ${admin.name} (${admin.email}), ID: ${admin._id}`);
        });

        console.log('-------------------------------');
        console.log('İşlem başarıyla tamamlandı!');
        console.log('Super Admin kullanıcısı oluşturuldu veya güncellendi.');
        console.log('-------------------------------');
        console.log('Giriş bilgileri:');
        console.log(`Email: ${SUPER_ADMIN.email}`);
        console.log(`Şifre: ${SUPER_ADMIN.password}`);
        console.log('-------------------------------');

    } catch (error) {
        console.error('HATA OLUŞTU:', error);
        console.error('Hata detayları:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        if (error.name === 'MongoServerSelectionError') {
            console.error('MongoDB sunucusuna bağlanılamadı. Lütfen MongoDB sunucusunun çalıştığından emin olun.');
            console.error('MongoDB uygulamasını bilgisayarınızda çalıştırın veya uzak MongoDB bağlantı bilgilerinizi kontrol edin.');
        }
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB bağlantısı kapatıldı');
        }
        process.exit(0);
    }
}

// Scripti çalıştır
createSuperAdmin(); 