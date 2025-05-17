import mongoose, { Schema, Document } from 'mongoose';

export interface IResponse extends Document {
    survey: mongoose.Types.ObjectId;
    business: mongoose.Types.ObjectId;
    customer: mongoose.Types.ObjectId | any; // Müşteri ID'si veya müşteri bilgi nesnesi olabilir
    userId: mongoose.Types.ObjectId; // Response.userId, gönderen kullanıcıyı temsil eder
    customerName?: string; // Müşteri adı
    customerEmail?: string; // Müşteri e-postası
    answers: Array<{
        question: mongoose.Types.ObjectId | string;
        value: string | number;
    }>;
    rewardPoints?: number; // Kazanılan ödül puanları
    updatedRewardPoints?: number; // Güncellenen ödül puanları
    pointsApproved?: boolean; // Puan onay durumu
    approvedBy?: mongoose.Types.ObjectId; // Puanları onaylayan kullanıcı
    approvedAt?: Date; // Onay tarihi
    rejectedBy?: mongoose.Types.ObjectId; // Puanları reddeden kullanıcı
    rejectedAt?: Date; // Red tarihi
    lastPointsUpdate?: Date; // Son puan güncelleme tarihi
    createdAt: Date;
    updatedAt: Date;
}

const ResponseSchema: Schema = new Schema({
    survey: {
        type: Schema.Types.ObjectId,
        ref: 'Survey',
        required: true
    },
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    customer: {
        type: Schema.Types.Mixed, // String (ObjectId) veya nesne olabilir
        ref: 'User'
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    customerName: String,
    customerEmail: String,
    answers: [{
        question: {
            type: Schema.Types.Mixed, // String (ObjectId) veya düz metin olabilir
            required: true
        },
        value: {
            type: Schema.Types.Mixed,
            required: true
        }
    }],
    rewardPoints: {
        type: Number,
        default: 0
    },
    updatedRewardPoints: {
        type: Number,
        default: 0
    },
    pointsApproved: {
        type: Boolean,
        default: null
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    lastPointsUpdate: Date
}, {
    timestamps: true
});

// Kayıtlı kullanıcılar (userId olanlar) için, her kullanıcı aynı ankete sadece bir kez yanıt verebilir
// Dikkat: Bu indeks MongoDB'de 'survey_1_userId_1' olarak adlandırılacak
ResponseSchema.index(
    { survey: 1, userId: 1 },
    {
        unique: true,
        partialFilterExpression: { userId: { $exists: true, $ne: null } }
    }
);

// MongoDB'den eski indeksleri temizlemek için bir kez çalışacak kod
// Bu kod, modelin ilk yüklenişinde çalışır ve eski indeksleri temizler
if (process.env.NODE_ENV !== 'production') {
    // Model oluşturulduktan sonra çalışsın
    mongoose.connection.once('open', async () => {
        try {
            console.log('🧹 MongoDB bağlantısı açıldı, Response modelindeki indeksler kontrol ediliyor...');
            console.log('MongoDB bağlantısı başarılı');

            // Bir süre bekle, bağlantının tamamen kurulmasını sağla
            await new Promise(resolve => setTimeout(resolve, 1000));

            // MongoDB'deki responses koleksiyonunu kontrol et
            const collections = await mongoose.connection.db.listCollections({ name: 'responses' }).toArray();

            if (collections.length > 0) {
                console.log('✅ responses koleksiyonu bulundu, indeksler temizlenecek');

                // Mevcut indeksleri getir
                const indexInfo = await mongoose.connection.db.collection('responses').indexes();
                console.log('Mevcut indeksler:', indexInfo.map(idx => idx.name));

                // Bilinenler dışındaki tüm indeksleri kaldır, sadece _id_ kalsın
                for (const idx of indexInfo) {
                    // _id_ indeksi MongoDB tarafından yönetilir, onu atlayalım
                    if (idx.name === '_id_') {
                        console.log('ℹ️ _id_ indeksi korunuyor');
                        continue;
                    }

                    console.log(`🗑️ "${idx.name}" indeksi siliniyor...`);
                    try {
                        await mongoose.connection.db.collection('responses').dropIndex(idx.name);
                        console.log(`✅ "${idx.name}" indeksi başarıyla silindi.`);
                    } catch (dropError) {
                        console.error(`⚠️ "${idx.name}" indeksini silerken hata:`, dropError);
                    }
                }

                console.log('✅ Tüm eski indeksler temizlendi, yeni indeksler oluşturulacak');
            } else {
                console.log('❗ responses koleksiyonu henüz oluşturulmamış, indeks temizleme atlanıyor');
            }

            // Collection'ı yeniden yapılandır
            try {
                // Basit bir indeks oluştur
                await mongoose.model('Response').collection.createIndex(
                    { survey: 1, userId: 1 },
                    {
                        sparse: true,  // Sadece userId alanı varsa indekse dahil et
                        background: true, // Arka planda oluştur
                        name: 'survey_userId_sparse' // Özel bir isim ver
                    }
                );
                console.log('✅ Yeni indeks başarıyla oluşturuldu: survey_userId_sparse');
            } catch (createError) {
                console.error('⚠️ Yeni indeks oluşturulurken hata:', createError);
            }

            console.log('✅ İndeks güncelleme işlemi tamamlandı');
        } catch (error) {
            console.error('⚠️ İndeks kontrol/temizleme işlemi başarısız:', error);
        }
    });
}

// Mongoose indeks tanımı - MongoDB'nin desteklediği formatta
ResponseSchema.index(
    { survey: 1, userId: 1 },
    { sparse: true } // sparse: userId null olduğunda indekse dahil etme
);

export const Response = mongoose.model<IResponse>('Response', ResponseSchema);

export default Response; 