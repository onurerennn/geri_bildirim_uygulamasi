# Anket & Geri Bildirim Uygulaması

Bu proje, işletmelerin müşterilerinden geri bildirim toplamalarını ve bu verileri analiz etmelerini sağlayan çok platformlu bir uygulamadır.

## Özellikler

- QR kod tabanlı anket sistemi
- Ödül sistemi ile müşteri katılımı
- NLP teknolojileri ile veri analizi
- Çok platformlu erişim (Web ve Mobil)
- Kapsamlı yönetim paneli

## Kullanıcı Tipleri

1. Süper Admin
2. İşletme Admin
3. Müşteri

## Teknik Altyapı

- Frontend: React.js (Web), React Native (Mobil)
- Backend: Node.js, Express.js
- Veritabanı: MongoDB
- AI/ML: NLP servisleri

## Veri Modeli

### User (Kullanıcı)
- id: string
- email: string
- password: string
- role: enum ['super_admin', 'business_admin', 'customer']
- name: string
- createdAt: date
- updatedAt: date

### Business (İşletme)
- id: string
- name: string
- adminId: string (ref: User)
- address: string
- phone: string
- qrCodes: array
- createdAt: date
- updatedAt: date

### Survey (Anket)
- id: string
- businessId: string (ref: Business)
- title: string
- questions: array
- startDate: date
- endDate: date
- status: enum ['active', 'inactive']
- createdAt: date
- updatedAt: date

### Response (Yanıt)
- id: string
- surveyId: string (ref: Survey)
- userId: string (ref: User)
- answers: array
- sentiment: object
- createdAt: date

### Reward (Ödül)
- id: string
- userId: string (ref: User)
- businessId: string (ref: Business)
- points: number
- type: enum ['survey_completion', 'referral']
- createdAt: date

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm start

# Test
npm test

# Derleme
npm run build
```

## Lisans

MIT 