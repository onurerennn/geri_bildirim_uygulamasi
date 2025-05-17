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
const app_1 = require("./app");
const mongoose_1 = __importDefault(require("mongoose"));
const PORT = Number(process.env.PORT) || 5000; // Port 5000'e ayarlandı
const HOST = '0.0.0.0'; // Tüm IP adreslerinden gelen bağlantıları dinle
// Uygulama başladığında indeksleri temizle
const cleanupIndexes = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('MongoDB indekslerini kontrol ediyor...');
        // Tüm model dosyalarını içe aktar
        const Survey = mongoose_1.default.model('Survey');
        // Eğer dropAllIndexes metodu tanımlanmışsa çağır
        if (Survey && typeof Survey.dropAllIndexes === 'function') {
            console.log('Survey modeli indeksleri temizleniyor...');
            yield Survey.dropAllIndexes();
        }
        else {
            console.log('İndeksleri temizleme metodu bulunamadı, koleksiyonu doğrudan kullanmayı dene');
            // Doğrudan koleksiyonu kullanarak temizle
            const collection = mongoose_1.default.connection.collection('surveys');
            if (collection) {
                yield collection.dropIndexes();
                console.log('Survey koleksiyonu indeksleri doğrudan temizlendi');
                // Temel indeksleri yeniden oluştur
                yield collection.createIndex({ business: 1 });
                yield collection.createIndex({ isActive: 1 });
                console.log('Temel indeksler yeniden oluşturuldu');
            }
        }
        console.log('İndeks temizleme işlemi tamamlandı');
    }
    catch (error) {
        console.error('İndeks temizleme hatası:', error);
    }
});
app_1.app.listen(PORT, HOST, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: Check your IP address and use port ${PORT}`);
    // MongoDB bağlantısı hazır olduğunda indeksleri temizle
    if (mongoose_1.default.connection.readyState === 1) {
        console.log('MongoDB bağlantısı hazır, indeksler kontrol ediliyor...');
        yield cleanupIndexes();
    }
    else {
        console.log('MongoDB bağlantısı hazır değil, indeksler temizlenemedi');
        // Bağlantı olayını dinle ve hazır olduğunda temizle
        mongoose_1.default.connection.once('connected', () => __awaiter(void 0, void 0, void 0, function* () {
            console.log('MongoDB bağlantısı kuruldu, indeksler kontrol ediliyor...');
            yield cleanupIndexes();
        }));
    }
}));
