import { app } from './app';
import mongoose from 'mongoose';

const PORT = Number(process.env.PORT) || 5000; // Port 5000'e ayarlandı
const HOST = '0.0.0.0'; // Tüm IP adreslerinden gelen bağlantıları dinle

// Uygulama başladığında indeksleri temizle
const cleanupIndexes = async () => {
    try {
        console.log('MongoDB indekslerini kontrol ediyor...');

        // Tüm model dosyalarını içe aktar
        const Survey = mongoose.model('Survey');

        // Eğer dropAllIndexes metodu tanımlanmışsa çağır
        if (Survey && typeof Survey.dropAllIndexes === 'function') {
            console.log('Survey modeli indeksleri temizleniyor...');
            await Survey.dropAllIndexes();
        } else {
            console.log('İndeksleri temizleme metodu bulunamadı, koleksiyonu doğrudan kullanmayı dene');
            // Doğrudan koleksiyonu kullanarak temizle
            const collection = mongoose.connection.collection('surveys');
            if (collection) {
                await collection.dropIndexes();
                console.log('Survey koleksiyonu indeksleri doğrudan temizlendi');

                // Temel indeksleri yeniden oluştur
                await collection.createIndex({ business: 1 });
                await collection.createIndex({ isActive: 1 });
                console.log('Temel indeksler yeniden oluşturuldu');
            }
        }

        console.log('İndeks temizleme işlemi tamamlandı');
    } catch (error) {
        console.error('İndeks temizleme hatası:', error);
    }
};

app.listen(PORT, HOST, async () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: Check your IP address and use port ${PORT}`);

    // MongoDB bağlantısı hazır olduğunda indeksleri temizle
    if (mongoose.connection.readyState === 1) {
        console.log('MongoDB bağlantısı hazır, indeksler kontrol ediliyor...');
        await cleanupIndexes();
    } else {
        console.log('MongoDB bağlantısı hazır değil, indeksler temizlenemedi');

        // Bağlantı olayını dinle ve hazır olduğunda temizle
        mongoose.connection.once('connected', async () => {
            console.log('MongoDB bağlantısı kuruldu, indeksler kontrol ediliyor...');
            await cleanupIndexes();
        });
    }
}); 
