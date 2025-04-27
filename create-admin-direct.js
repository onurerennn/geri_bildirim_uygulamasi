const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// MongoDB bağlantı bilgileri
// NOT: Kendi MongoDB Atlas bağlantı dizginizi kullanın
const MONGO_URI = 'mongodb+srv://KULLANICI_ADI:SIFRE@ac-pi6ded6.kspmohq.mongodb.net/proje?retryWrites=true&w=majority';
const MONGO_DB_NAME = 'proje';  // MongoDB veritabanı adı konsolda "proje" olarak görünüyor
const USERS_COLLECTION = 'users';

// Admin kullanıcısı bilgileri
const ADMIN_USER = {
    name: 'Super Admin',
    email: 'admin@example.com',  // Farklı bir email adresi kullanıyoruz
    password: 'admin123',        // Basit bir şifre
    role: 'SUPER_ADMIN',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
};

console.log('Admin oluşturma scripti başlatılıyor...');
console.log('Admin bilgileri:', {
    email: ADMIN_USER.email,
    password: ADMIN_USER.password
});

async function createAdmin() {
    let client;

    try {
        console.log('MongoDB bağlantısı kuruluyor...');
        client = new MongoClient(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        await client.connect();
        console.log('MongoDB bağlantısı başarılı');

        const db = client.db(MONGO_DB_NAME);

        // Veritabanındaki koleksiyonları kontrol et
        const collections = await db.listCollections().toArray();
        console.log('Mevcut koleksiyonlar:', collections.map(c => c.name));

        const usersCollection = db.collection(USERS_COLLECTION);

        // Şifreyi hash'le - $2a$ formatında
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_USER.password, salt);
        console.log('Şifre hash\'lendi:', hashedPassword);

        // Kullanıcıyı hazırla
        const userData = {
            ...ADMIN_USER,
            password: hashedPassword
        };

        // Mevcut hesabı kontrol et
        const existingUser = await usersCollection.findOne({ email: ADMIN_USER.email });
        if (existingUser) {
            console.log('Bu email ile kullanıcı zaten var. Siliniyor...');
            await usersCollection.deleteOne({ email: ADMIN_USER.email });
        }

        // Yeni kullanıcıyı ekle
        const result = await usersCollection.insertOne(userData);
        console.log('Admin eklendi:', result.insertedId);

        // Test için şifre kontrolü
        const testCompare = await bcrypt.compare(ADMIN_USER.password, hashedPassword);
        console.log('Şifre kontrolü:', testCompare ? 'BAŞARILI' : 'BAŞARISIZ');

        console.log('-------------------------------');
        console.log('Admin kullanıcısı oluşturuldu:');
        console.log(`Email: ${ADMIN_USER.email}`);
        console.log(`Şifre: ${ADMIN_USER.password}`);
        console.log('-------------------------------');

    } catch (error) {
        console.error('HATA:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB bağlantısı kapatıldı');
        }
    }
}

createAdmin(); 