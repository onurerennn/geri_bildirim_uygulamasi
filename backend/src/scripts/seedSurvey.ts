import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Survey } from '../models';

dotenv.config();

const seedSurvey = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback-app');
        console.log('MongoDB bağlantısı başarılı');

        const testSurvey = {
            title: 'Müşteri Memnuniyet Anketi',
            description: 'Hizmetlerimizi değerlendirmeniz için lütfen anketi doldurun.',
            questions: [
                {
                    text: 'Hizmet kalitemizi nasıl değerlendirirsiniz?',
                    type: 'rating',
                    required: true
                },
                {
                    text: 'Eklemek istediğiniz görüşleriniz nelerdir?',
                    type: 'text',
                    required: false
                }
            ],
            isActive: true,
            startDate: new Date(),
            business: '65f2f7c1e584d05a5958e2e1', // İşletme ID'sini kendi veritabanınızdaki bir işletme ID'si ile değiştirin
            createdBy: '65f2f7c1e584d05a5958e2e0' // Kullanıcı ID'sini kendi veritabanınızdaki bir kullanıcı ID'si ile değiştirin
        };

        const existingSurvey = await Survey.findOne({ title: testSurvey.title });

        if (existingSurvey) {
            console.log('Test anketi zaten mevcut, güncelleniyor...');
            Object.assign(existingSurvey, testSurvey);
            await existingSurvey.save();
            console.log('Test anketi güncellendi');
        } else {
            console.log('Yeni test anketi oluşturuluyor...');
            await Survey.create(testSurvey);
            console.log('Test anketi oluşturuldu');
        }

        process.exit(0);
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
};

seedSurvey(); 