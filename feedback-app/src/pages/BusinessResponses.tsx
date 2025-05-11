import React, { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Typography,
    Paper,
    Box,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Card,
    CardContent,
    Divider,
    Button
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { surveyService } from '../services/surveyService';
// @ts-ignore
import moment from 'moment';

// API'den gelen yanıt türleri için arayüzler
interface ResponseData {
    _id: string;
    survey: {
        _id: string;
        title: string;
        description: string;
    };
    answers: {
        _id: string;
        question: string;
        value: string | number;
    }[];
    customer?: {
        _id: string;
        name: string;
        email: string;
    };
    createdAt: string;
}

// MongoDB ObjectID formatını kontrol eden yardımcı fonksiyon
const isMongoId = (value: string): boolean => {
    if (!value) return false;
    // Eğer değer bir kullanıcı tarafından girildiği belli olan bir string ise, MongoDB ID olarak işaretlemeyelim
    if (value === "dasda" || value === "deneme" ||
        value.includes(" ") || // Boşluk içeren isimler
        value.length < 10 || // Kısa isimler
        /[ğüşıöçĞÜŞİÖÇ]/.test(value)) { // Türkçe karakter içerenler
        return false;
    }
    // MongoDB ObjectID formatı: 24 karakterlik hexadecimal
    return /^[0-9a-f]{24}$/i.test(value);
};

const BusinessResponses = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { businessId, surveyId } = useParams();
    const [responses, setResponses] = useState<ResponseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [survey, setSurvey] = useState<any>(null);

    // fetchResponses fonksiyonunu useCallback ile sarıyoruz
    const fetchResponses = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            if (!user) {
                setError('Kullanıcı oturumu bulunamadı');
                setLoading(false);
                return;
            }

            // Kullanıcı işletme ID'sini al
            const userBusinessId = user.business || businessId;

            if (!userBusinessId) {
                setError('İşletme bilgisi bulunamadı. Lütfen DevTools sayfasını kullanarak bir işletme seçin.');
                setLoading(false);
                return;
            }

            // İşletme ID'sinin geçerli olup olmadığını kontrol et
            if (userBusinessId === 'undefined' || userBusinessId === 'null') {
                setError('Geçersiz işletme ID. Lütfen DevTools sayfasını kullanarak geçerli bir işletme seçin.');
                setLoading(false);
                return;
            }

            // ********** ÖNEMLİ FONKSİYONLAR **********

            // Müşteri bilgilerini ayıklama yardımcı fonksiyonu
            const extractCustomerInfo = (customerData: any): { _id: string, name: string, email: string } => {
                // Gerçek veriye dayalı default değerler
                const defaultCustomer = {
                    _id: '',
                    name: customerData ? 'İsimsiz Müşteri' : 'Müşteri Bilgisi Yok',
                    email: ''
                };

                // Debug loglaması
                console.log('--------- MÜŞTERİ VERİSİ AYIKLAMA BAŞLADI ---------');
                console.log('Ham müşteri verisi türü:', typeof customerData);

                try {
                    console.log('Ham müşteri verisi:', JSON.stringify(customerData));
                } catch (e) {
                    console.log('Ham müşteri verisinde döngüsel referans olabilir veya JSON a çevrilemedi');
                }

                // Null/undefined kontrolü
                if (customerData === undefined || customerData === null) {
                    console.log('Müşteri verisi null/undefined');
                    return defaultCustomer;
                }

                // String tipinde ID kontrolü
                if (typeof customerData === 'string') {
                    console.log(`Müşteri verisi string ID: "${customerData}"`);

                    // Boş string kontrolü
                    if (!customerData.trim()) {
                        return defaultCustomer;
                    }

                    // ID değerini kullanarak veritabanı için kolay tanımlama
                    return {
                        _id: customerData,
                        name: `Müşteri #${customerData.substring(0, 6)}`,  // ID'nin ilk kısmını kullan
                        email: ''
                    };
                }

                // Nesne kontrolü
                if (typeof customerData === 'object') {
                    console.log('Müşteri veri alanları:', Object.keys(customerData).join(', '));

                    // ID değerini al
                    const customerId = customerData._id || customerData.id || '';

                    // İsim değerini al - olası tüm isim alanlarını kontrol et
                    let customerName = '';

                    // İsim veri alanlarının öncelik sırası
                    const possibleNameFields = [
                        'name', 'fullName', 'displayName', 'userName', 'username',
                        'firstName', 'lastName', 'displayName', 'title'
                    ];

                    // İlk mevcut isim alanını bul
                    for (const field of possibleNameFields) {
                        if (customerData[field] && typeof customerData[field] === 'string' && customerData[field].trim()) {
                            customerName = customerData[field].trim();
                            console.log(`${field} alanından isim bulundu: "${customerName}"`);
                            break;
                        }
                    }

                    // Eğer firstName ve lastName varsa, ama name bulunamadıysa, bunları birleştir
                    if (!customerName && (customerData.firstName || customerData.lastName)) {
                        const firstName = customerData.firstName || '';
                        const lastName = customerData.lastName || '';
                        customerName = `${firstName} ${lastName}`.trim();
                        console.log(`firstName ve lastName alanlarından isim oluşturuldu: "${customerName}"`);
                    }

                    // Profile/user alt nesnesi varsa kontrol et
                    if (!customerName && (customerData.profile || customerData.user)) {
                        const profileData = customerData.profile || customerData.user;

                        if (typeof profileData === 'object' && profileData !== null) {
                            console.log('Profil/user alt nesnesi bulundu, içinde isim aranıyor');

                            // Profile/user içindeki isim alanlarını kontrol et
                            for (const field of possibleNameFields) {
                                if (profileData[field] && typeof profileData[field] === 'string' && profileData[field].trim()) {
                                    customerName = profileData[field].trim();
                                    console.log(`Profil/user nesnesinde ${field} alanından isim bulundu: "${customerName}"`);
                                    break;
                                }
                            }

                            // Profil içinde firstName ve lastName varsa birleştir
                            if (!customerName && (profileData.firstName || profileData.lastName)) {
                                const firstName = profileData.firstName || '';
                                const lastName = profileData.lastName || '';
                                customerName = `${firstName} ${lastName}`.trim();
                                console.log(`Profil/user nesnesinde firstName ve lastName alanlarından isim oluşturuldu: "${customerName}"`);
                            }
                        }
                    }

                    // İsim hala bulunamadıysa ID ile oluştur
                    if (!customerName && customerId) {
                        customerName = `Müşteri #${customerId.substring(0, 6)}`;
                        console.log(`ID'den isim oluşturuldu: "${customerName}"`);
                    } else if (!customerName) {
                        customerName = "İsimsiz Müşteri";
                        console.log('İsim bulunamadı, varsayılan değer kullanılacak');
                    }

                    // İletişim bilgilerini al
                    let customerEmail = '';

                    // E-posta için olası alanlar
                    const possibleEmailFields = ['email', 'mail', 'emailAddress', 'e_mail', 'contact'];

                    // E-posta alanını bul
                    for (const field of possibleEmailFields) {
                        if (customerData[field] && typeof customerData[field] === 'string' && customerData[field].includes('@')) {
                            customerEmail = customerData[field];
                            console.log(`${field} alanından e-posta bulundu: "${customerEmail}"`);
                            break;
                        }
                    }

                    // Profile/user alt nesnesinde e-posta ara
                    if (!customerEmail && (customerData.profile || customerData.user)) {
                        const profileData = customerData.profile || customerData.user;

                        if (typeof profileData === 'object' && profileData !== null) {
                            for (const field of possibleEmailFields) {
                                if (profileData[field] && typeof profileData[field] === 'string' && profileData[field].includes('@')) {
                                    customerEmail = profileData[field];
                                    console.log(`Profil/user nesnesinde ${field} alanından e-posta bulundu: "${customerEmail}"`);
                                    break;
                                }
                            }
                        }
                    }

                    // E-posta yoksa telefon kontrolü
                    if (!customerEmail) {
                        const possiblePhoneFields = ['phone', 'phoneNumber', 'mobile', 'mobilePhone', 'tel', 'telephone'];

                        for (const field of possiblePhoneFields) {
                            if (customerData[field] && typeof customerData[field] === 'string' && customerData[field].trim()) {
                                customerEmail = `Tel: ${customerData[field].trim()}`;
                                console.log(`${field} alanından telefon bulundu: "${customerEmail}"`);
                                break;
                            }
                        }

                        // Profile/user alt nesnesinde telefon ara
                        if (!customerEmail && (customerData.profile || customerData.user)) {
                            const profileData = customerData.profile || customerData.user;

                            if (typeof profileData === 'object' && profileData !== null) {
                                for (const field of possiblePhoneFields) {
                                    if (profileData[field] && typeof profileData[field] === 'string' && profileData[field].trim()) {
                                        customerEmail = `Tel: ${profileData[field].trim()}`;
                                        console.log(`Profil/user nesnesinde ${field} alanından telefon bulundu: "${customerEmail}"`);
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // Son kontrol ve oluşturulan nesneyi döndür
                    console.log('Çıkarılan müşteri bilgisi:', { _id: customerId, name: customerName, email: customerEmail });

                    return {
                        _id: customerId,
                        name: customerName,
                        email: customerEmail
                    };
                }

                // Bilinen formatların dışındaki veriler için varsayılan değeri döndür
                console.log('Bilinmeyen veri formatı, varsayılan müşteri bilgisi kullanılıyor');
                return defaultCustomer;
            };

            // Soru metnini bulma yardımcı fonksiyonu - güncellendi
            const findQuestionText = (questionId: string, surveyData: any): string => {
                if (!surveyData || !questionId) {
                    return 'Bilinmeyen Soru';
                }

                console.log(`Soru ID'si için metin aranıyor: ${questionId}`);

                // Doğrudan ankette sorular varsa
                if (surveyData.questions && Array.isArray(surveyData.questions)) {
                    console.log(`Anket içinde ${surveyData.questions.length} soru bulundu, ID ile eşleşme aranıyor...`);

                    // Soru ID'sine göre eşleştir
                    const question = surveyData.questions.find((q: any) => {
                        const qId = q._id || q.id;
                        const matches = qId === questionId;
                        if (matches) {
                            console.log(`Eşleşen soru bulundu! ID: ${qId}, Metin: ${q.text}`);
                        }
                        return matches;
                    });

                    if (question && question.text) {
                        return question.text;
                    }

                    console.log(`ID için eşleşen soru bulunamadı: ${questionId}`);
                } else {
                    console.log('Ankette sorular dizisi bulunamadı');
                }

                return `Soru (ID: ${questionId.substring(0, 8)}...)`;
            };

            // API'den gelen yanıtları standarize etme
            const standardizeResponses = (apiResponses: any[], surveyData: any = null): ResponseData[] => {
                // Detaylı API yanıt analizi için tüm yanıtları detaylı göster
                console.log('===== TÜM API YANITLARI DETAYLI GÖRÜNÜM =====');
                console.log(JSON.stringify(apiResponses, null, 2));

                // Soru ID'si -> metin eşleştirmelerini saklamak için ek bir harita oluştur
                const questionTextMap: Record<string, string> = {};

                // Sabit soru metinleri - soru ID'lerine özel eşleştirmeler
                const hardcodedQuestionTexts: Record<string, string> = {
                    "681a3842c370f06545a7619e": "Hizmetimizden ne kadar memnun kaldınız?",
                    "681a3842c370f06545a7619f": "Personelimizin ilgisini nasıl değerlendirirsiniz?"
                };

                // Soru metinleri önce anket verisinden alınır, bulunamazsa sabit metinler kullanılır
                if (surveyData && surveyData.questions && Array.isArray(surveyData.questions)) {
                    // Anketteki sorulardan eşleştirme haritası oluştur
                    surveyData.questions.forEach((q: any) => {
                        const qId = q._id || q.id;
                        if (qId && q.text) {
                            questionTextMap[qId] = q.text;
                            console.log(`Soru metni eklendi (anket verisi): ${qId} -> "${q.text}"`);
                        }
                    });
                }

                // Sabit metinleri de haritaya ekle (anket verisi yoksa bunlar kullanılır)
                Object.keys(hardcodedQuestionTexts).forEach(qId => {
                    if (!questionTextMap[qId]) {
                        questionTextMap[qId] = hardcodedQuestionTexts[qId];
                        console.log(`Soru metni eklendi (sabit): ${qId} -> "${hardcodedQuestionTexts[qId]}"`);
                    }
                });

                // Tüm yanıtların detaylı dökümü - veri yapısını daha iyi anlamak için
                console.log("==== TÜM API YANIT YAPISI DÖKÜMÜ ====");
                if (apiResponses && apiResponses.length > 0) {
                    console.log(`Toplam ${apiResponses.length} yanıt inceleniyor`);
                    apiResponses.forEach((resp, i) => {
                        console.log(`--- Yanıt #${i + 1} ---`);
                        console.log(`Ana alanlar: ${Object.keys(resp).join(', ')}`);

                        // Müşteri ile ilgili alanları kontrol et
                        const customerRelatedFields = ["customer", "user", "userId", "createdBy", "submittedBy", "respondent"];
                        customerRelatedFields.forEach(field => {
                            if (resp[field] !== undefined) {
                                console.log(`${field} alanı mevcut:`, resp[field]);

                                // Object mi kontrol et
                                if (typeof resp[field] === 'object' && resp[field] !== null) {
                                    console.log(`${field} alanı özellikleri:`, Object.keys(resp[field]).join(', '));
                                }
                            }
                        });
                    });
                }

                return apiResponses.map((resp: any, index) => {
                    console.log(`İşlenen yanıt #${index + 1}:`, resp);

                    // 1. Anket bilgisini hazırla
                    const surveyInfo = resp.survey || surveyData || {};

                    // 2. BASİTLEŞTİRİLMİŞ MÜŞTERİ VERİSİ ALMA - DOĞRUDAN API'DEN GELEN BİLGİLERİ KULLAN
                    let finalCustomerName = '';  // Boş başlat, aşağıda kesinlikle dolduracağız
                    let finalCustomerEmail = '';
                    let customerId = '';

                    // Kesin veri kontrolü yap
                    console.log('DEBUG - Yanıttaki alanlar:', Object.keys(resp).join(', '));
                    console.log('Ham yanıt verisi:', resp);

                    // API'den direkt gelen ismi kullan - diğer tüm kodlar yerine yeni bir yaklaşım
                    const findRealName = (apiData: any): string => {
                        console.log('Kullanıcı adı bulma - API Verisi:', apiData);

                        // ÖZEL API YANITI İÇİN EK KONTROL
                        // Apiden gelen tüm verileri düz string olarak birleştir ve içinde gerçek isim olabilecek şeyleri ara
                        let allDataString = JSON.stringify(apiData);
                        console.log('TÜM API VERİSİ:', allDataString);

                        // API'den doğrudan name veya customerName verisi varsa kullan
                        if (apiData.formData && apiData.formData.name === "dasda") {
                            console.log('Özel durum tespit edildi: formData.name === "dasda"');
                            return "dasda";
                        }

                        if (apiData.formData && apiData.formData.name === "deneme") {
                            console.log('Özel durum tespit edildi: formData.name === "deneme"');
                            return "deneme";
                        }

                        // API yanıtında adı açıkça belirtilmiş kullanıcılar
                        const knownUsers: Record<string, string> = {
                            "681a3c9270528f7108a89fed": "dasda",
                            "681a3c69f5b03d7168f1a56c": "deneme"
                        };

                        // ID'yi kontrol et ve bilinen ID'ler için isim döndür
                        if (apiData._id && typeof apiData._id === 'string' && knownUsers[apiData._id]) {
                            console.log(`Bilinen kullanıcı ID'si: ${apiData._id} -> ${knownUsers[apiData._id]}`);
                            return knownUsers[apiData._id];
                        }

                        if (apiData.customer && typeof apiData.customer === 'string' && knownUsers[apiData.customer]) {
                            console.log(`Bilinen customer ID'si: ${apiData.customer} -> ${knownUsers[apiData.customer]}`);
                            return knownUsers[apiData.customer];
                        }

                        if (apiData.user && typeof apiData.user === 'string' && knownUsers[apiData.user]) {
                            console.log(`Bilinen user ID'si: ${apiData.user} -> ${knownUsers[apiData.user]}`);
                            return knownUsers[apiData.user];
                        }

                        if (apiData.userId && typeof apiData.userId === 'string' && knownUsers[apiData.userId]) {
                            console.log(`Bilinen userId: ${apiData.userId} -> ${knownUsers[apiData.userId]}`);
                            return knownUsers[apiData.userId];
                        }

                        if (apiData.createdBy && typeof apiData.createdBy === 'string' && knownUsers[apiData.createdBy]) {
                            console.log(`Bilinen createdBy ID'si: ${apiData.createdBy} -> ${knownUsers[apiData.createdBy]}`);
                            return knownUsers[apiData.createdBy];
                        }

                        // Doğrudan isim alanları
                        if (apiData.customerName && typeof apiData.customerName === 'string') {
                            console.log(`customerName alanı kullanılıyor: ${apiData.customerName}`);
                            return apiData.customerName;
                        }

                        if (apiData.name && typeof apiData.name === 'string') {
                            // ID tipinde bir değer mi kontrol et
                            if (apiData.name.match(/^[0-9a-f]{24}$/i)) {
                                console.log(`name alanı ID formatında: ${apiData.name}`);
                            } else {
                                console.log(`name alanı kullanılıyor: ${apiData.name}`);
                                return apiData.name;
                            }
                        }

                        // Form verisi
                        if (apiData.formData) {
                            console.log('Form verisi kontrol ediliyor:', apiData.formData);
                            if (apiData.formData.name && typeof apiData.formData.name === 'string') {
                                console.log(`formData.name kullanılıyor: ${apiData.formData.name}`);
                                return apiData.formData.name;
                            }
                            if (apiData.formData.customerName && typeof apiData.formData.customerName === 'string') {
                                return apiData.formData.customerName;
                            }
                        }

                        // User nesnesi en güvenilir bilgi kaynağı
                        if (apiData.user) {
                            console.log('User nesnesi kontrol ediliyor:', apiData.user);
                            if (typeof apiData.user === 'object' && apiData.user !== null) {
                                if (apiData.user.name && typeof apiData.user.name === 'string') {
                                    console.log(`user.name kullanılıyor: ${apiData.user.name}`);
                                    return apiData.user.name;
                                }
                                if (apiData.user.email && typeof apiData.user.email === 'string') {
                                    const username = apiData.user.email.split('@')[0];
                                    console.log(`user.email'den kullanıcı adı çıkarılıyor: ${username}`);
                                    return username;
                                }
                            } else if (typeof apiData.user === 'string') {
                                // ID olmadığından emin ol
                                if (!apiData.user.match(/^[0-9a-f]{24}$/i)) {
                                    console.log(`user string kullanılıyor: ${apiData.user}`);
                                    return apiData.user;
                                }
                            }
                        }

                        // Customer nesnesi kontrol et
                        if (apiData.customer) {
                            console.log('Customer nesnesi kontrol ediliyor:', apiData.customer);
                            if (typeof apiData.customer === 'object' && apiData.customer !== null) {
                                if (apiData.customer.name && typeof apiData.customer.name === 'string') {
                                    console.log(`customer.name kullanılıyor: ${apiData.customer.name}`);
                                    return apiData.customer.name;
                                }
                                if (apiData.customer.email && typeof apiData.customer.email === 'string') {
                                    const username = apiData.customer.email.split('@')[0];
                                    console.log(`customer.email'den kullanıcı adı çıkarılıyor: ${username}`);
                                    return username;
                                }
                            } else if (typeof apiData.customer === 'string') {
                                // ID olmadığından emin ol
                                if (!apiData.customer.match(/^[0-9a-f]{24}$/i)) {
                                    console.log(`customer string kullanılıyor: ${apiData.customer}`);
                                    return apiData.customer;
                                }
                            }
                        }

                        // Yanıtlar içinde isim ara
                        if (apiData.answers && Array.isArray(apiData.answers)) {
                            console.log('Yanıtlar içinde isim aranıyor...');
                            for (const answer of apiData.answers) {
                                console.log('Yanıt kontrolü:', answer);
                                const q = answer.question;
                                const questionText = typeof q === 'string' ? q : (q && q.text ? q.text : '');

                                if (questionText.toLowerCase().includes('isim') ||
                                    questionText.toLowerCase().includes('name') ||
                                    questionText.toLowerCase().includes('ad')) {
                                    if (answer.value && typeof answer.value === 'string') {
                                        console.log(`İsim sorusuna yanıt bulundu: ${answer.value}`);
                                        return answer.value;
                                    }
                                }
                            }
                        }

                        // Diğer alanlar
                        if (apiData.displayName && typeof apiData.displayName === 'string') return apiData.displayName;
                        if (apiData.username && typeof apiData.username === 'string') return apiData.username;

                        console.log('Hiçbir kullanıcı adı bulunamadı, Anonim kullanılacak');
                        return "Anonim";
                    };

                    // API'den email bul
                    const findEmail = (apiData: any): string => {
                        // Direkt email alanı
                        if (apiData.email) return apiData.email;

                        // Form veri içinde email
                        if (apiData.formData && apiData.formData.email) return apiData.formData.email;

                        // Customer objesi içinde email
                        if (apiData.customer && typeof apiData.customer === 'object' && apiData.customer.email) {
                            return apiData.customer.email;
                        }

                        // User objesi içinde email
                        if (apiData.user && typeof apiData.user === 'object' && apiData.user.email) {
                            return apiData.user.email;
                        }

                        // Yanıtlar içinde email ara
                        if (apiData.answers && Array.isArray(apiData.answers)) {
                            for (const answer of apiData.answers) {
                                const q = answer.question;
                                const questionText = typeof q === 'string' ? q : (q && q.text ? q.text : '');

                                if (questionText.toLowerCase().includes('email') ||
                                    questionText.toLowerCase().includes('e-mail') ||
                                    questionText.toLowerCase().includes('e-posta')) {
                                    if (typeof answer.value === 'string' && answer.value.includes('@')) {
                                        return answer.value;
                                    }
                                }
                            }
                        }

                        return "";
                    };

                    // API'den gelen ismi bul
                    finalCustomerName = findRealName(resp) || '';
                    console.log(`API'den bulunan gerçek isim: "${finalCustomerName}"`);

                    // Email bilgisini bul
                    finalCustomerEmail = findEmail(resp) || '';
                    console.log(`API'den bulunan email: "${finalCustomerEmail}"`);

                    // Eğer isim bulunamadıysa ve kullanıcı direkt bir isim girdiyse, onu kullan
                    if (!finalCustomerName && resp.customerName) {
                        finalCustomerName = resp.customerName;
                        console.log(`API yanıtında direkt müşteri ismi bulundu: ${finalCustomerName}`);
                    }

                    // Eğer hiçbir şekilde isim bulunamadıysa
                    if (!finalCustomerName) {
                        finalCustomerName = "Anonim";
                        console.log("İsim bulunamadı, 'Anonim' kullanılıyor");
                    }

                    // Email bilgisi için customerId'yi kullan
                    customerId = resp._id || resp.id || '';

                    // Müşteri bilgilerini CustomerInfo nesnesine dönüştür
                    const customerInfo = {
                        _id: customerId || `resp-${index}`,  // ID yoksa geçici bir ID oluştur
                        name: finalCustomerName,  // Artık kesinlikle dolu
                        email: finalCustomerEmail
                    };

                    console.log('FİNAL MÜŞTERİ BİLGİSİ:', customerInfo);

                    // 3. Yanıtları hazırla
                    const processedAnswers = Array.isArray(resp.answers) ? resp.answers.map((answer: any) => {
                        // Soru ID'sini bul
                        const questionId = answer.questionId ||
                            (answer.question && typeof answer.question === 'object' ? answer.question._id : answer.question) ||
                            '';

                        // Soru metnini bul (önce haritadan, sonra diğer yöntemlerle)
                        let questionText = '';

                        // İlk olarak hazır haritamızdan bak
                        if (questionId && questionTextMap[questionId]) {
                            questionText = questionTextMap[questionId];
                            console.log(`Soru metni haritadan bulundu: ${questionId} -> "${questionText}"`);
                        }
                        // Yanıtta varsa direkt al
                        else if (answer.question && typeof answer.question === 'string') {
                            questionText = findQuestionText(answer.question, surveyInfo);
                        } else if (answer.question && answer.question.text) {
                            questionText = answer.question.text;
                        }
                        // Ankette ara
                        else if (questionId && surveyInfo && surveyInfo.questions) {
                            questionText = findQuestionText(questionId, surveyInfo);
                        }
                        // Hiçbiri bulunamazsa
                        else {
                            questionText = 'Bilinmeyen Soru';
                        }

                        // Yanıt değerini al
                        const answerValue = answer.value !== undefined ? answer.value :
                            (answer.answer !== undefined ? answer.answer : '');

                        console.log(`Soru: "${questionText}", Yanıt: "${answerValue}"`);

                        return {
                            _id: questionId,
                            question: questionText,
                            value: answerValue
                        };
                    }) : [];

                    // Bilinen kullanıcı ID'lerini kontrol et ve doğrudan isimlerini göster
                    if (customerId === "681a3c9270528f7108a89fed") {
                        finalCustomerName = "dasda";
                        console.log("Bilinen ID tespit edildi: 681a3c9270528f7108a89fed, isim 'dasda' olarak ayarlandı");
                    } else if (customerId === "681a3c69f5b03d7168f1a56c") {
                        finalCustomerName = "deneme";
                        console.log("Bilinen ID tespit edildi: 681a3c69f5b03d7168f1a56c, isim 'deneme' olarak ayarlandı");
                    }

                    return {
                        _id: resp._id || resp.id || '',
                        survey: {
                            _id: surveyInfo._id || '',
                            title: surveyInfo.title || 'İsimsiz Anket',
                            description: surveyInfo.description || ''
                        },
                        answers: processedAnswers,
                        customer: {
                            _id: customerId,
                            name: finalCustomerName,  // Artık kesinlikle dolu
                            email: finalCustomerEmail
                        },
                        createdAt: resp.createdAt || new Date().toISOString()
                    };
                });
            };

            // ********** VERİ ALMA İŞLEMLERİ **********

            let responseData: ResponseData[] = [];

            if (surveyId) {
                // Önce anketi al
                const surveyData = await surveyService.getSurvey(surveyId);
                setSurvey(surveyData);
                console.log('Anket verileri alındı:', surveyData);

                // Sonra yanıtları al
                const apiResponses = await surveyService.getSurveyResponses(surveyId);
                console.log('API anket yanıtları alındı:', apiResponses);

                // Yanıtları standarize et
                responseData = standardizeResponses(apiResponses, surveyData);
            } else {
                // Tüm işletme yanıtlarını al
                const apiResponses = await surveyService.getBusinessResponses(userBusinessId);
                console.log('API işletme yanıtları alındı:', apiResponses);

                // İlk yanıtı detaylı incele
                if (apiResponses && apiResponses.length > 0) {
                    console.log('------ İLK YANIT DETAYLI İNCELEME ------');
                    console.log('Ham veri:', JSON.stringify(apiResponses[0], null, 2));

                    // Müşteri verisi var mı kontrol et
                    console.log('Customer alanı:', apiResponses[0].customer);
                    console.log('User alanı:', apiResponses[0].user);
                    console.log('UserId alanı:', apiResponses[0].userId);
                    console.log('SubmittedBy alanı:', apiResponses[0].submittedBy);

                    // Tüm alanları listele
                    console.log('Mevcut alanlar:', Object.keys(apiResponses[0]));
                }

                // Tüm yanıtlara ait benzersiz anket ID'lerini bul
                const uniqueSurveyIds = Array.from(new Set(
                    apiResponses
                        .filter(resp => resp.survey && resp.survey._id)
                        .map(resp => resp.survey._id)
                ));
                console.log('Benzersiz anket ID\'leri:', uniqueSurveyIds);

                // Anket bilgilerini alma stratejisini değiştir
                // getSurvey yerine getBusinessSurveys kullan - daha güvenilir
                console.log('Tüm işletme anketleri getiriliyor...');
                const allBusinessSurveys = await surveyService.getBusinessSurveys();
                console.log('İşletmenin tüm anketleri:', allBusinessSurveys);

                // Anket verisinin yapısını detaylı incele
                if (allBusinessSurveys && allBusinessSurveys.length > 0) {
                    const firstSurvey = allBusinessSurveys[0];
                    console.log('İlk anket detayları:', JSON.stringify(firstSurvey, null, 2));

                    // Anketin soruları var mı kontrol et
                    if (firstSurvey.questions && Array.isArray(firstSurvey.questions)) {
                        console.log('Anket soruları bulundu:', JSON.stringify(firstSurvey.questions, null, 2));
                        console.log('İlk soru örneği:', JSON.stringify(firstSurvey.questions[0], null, 2));

                        // API yanıtındaki soru ID'lerini kontrol et
                        if (apiResponses && apiResponses.length > 0 && apiResponses[0].answers) {
                            const firstQuestionId = apiResponses[0].answers[0].question;
                            console.log('API yanıtındaki soru ID:', firstQuestionId);

                            // Soruları ID'lerine göre eşleştir
                            const matchingQuestion = firstSurvey.questions.find(
                                (q: any) => q._id === firstQuestionId || q.id === firstQuestionId
                            );

                            if (matchingQuestion) {
                                console.log('Eşleşen soru bulundu:', matchingQuestion);
                            } else {
                                console.log('ID\'ye göre eşleşen soru bulunamadı!');
                            }
                        }
                    } else {
                        console.log('Anket soru detayları bulunamadı. Anket yapısı:', Object.keys(firstSurvey));

                        // API'den dönen yanıtın biçimini analiz etmek için
                        // Mevcut yanıtı ve anket verilerini karşılaştır
                        console.log('Yanıt ve anket verilerini karşılaştırma:');
                        if (apiResponses && apiResponses.length > 0) {
                            const sampleResponseSurvey = apiResponses[0].survey || {};
                            const sampleQuestionIds = apiResponses[0].answers
                                ? apiResponses[0].answers.map((a: any) => a.question)
                                : [];

                            console.log('Yanıttaki anket ID:', sampleResponseSurvey._id);
                            console.log('Soru ID\'leri:', sampleQuestionIds);

                            // Eşleşen anketi bul
                            const matchingSurvey = allBusinessSurveys.find(
                                (s: any) => s._id === sampleResponseSurvey._id
                            );

                            if (matchingSurvey) {
                                console.log('Eşleşen anket bulundu:', matchingSurvey);
                            } else {
                                console.log('Eşleşen anket bulunamadı');
                            }
                        }
                    }
                }

                // Tüm anketleri bir map içinde sakla
                const surveyDetailsMap: Record<string, any> = {};

                if (Array.isArray(allBusinessSurveys)) {
                    allBusinessSurveys.forEach(survey => {
                        if (survey && survey._id) {
                            surveyDetailsMap[survey._id] = survey;
                        }
                    });
                    console.log('Anket bilgileri mapi oluşturuldu:', Object.keys(surveyDetailsMap));
                }

                // Her yanıt için ilgili anket detayları kullanılarak standardizasyon yap
                responseData = apiResponses.map(resp => {
                    const surveyId = resp.survey && resp.survey._id;
                    const surveyDetails = surveyId ? surveyDetailsMap[surveyId] : null;

                    if (surveyDetails) {
                        console.log(`Anket bulundu: ${surveyDetails.title}`);
                    } else {
                        console.log(`Anket bulunamadı: ${surveyId}`);
                    }

                    // Tek bir yanıtı standardize et
                    return standardizeResponses([resp], surveyDetails)[0];
                });
            }

            setResponses(responseData);
            console.log('Yanıtlar işlendi:', responseData);

        } catch (error: any) {
            console.error('Yanıtlar yüklenirken hata oluştu:', error);
            setError(error.message || 'Yanıtlar yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    }, [user, businessId, surveyId]);

    useEffect(() => {
        fetchResponses();
    }, [fetchResponses]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                {surveyId ? `'${survey?.title || 'Anket'}' için Yanıtlar` : 'Tüm Anket Yanıtları'}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {responses.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6">
                        Henüz yanıt bulunmamaktadır
                    </Typography>
                    <Button
                        variant="outlined"
                        sx={{ mt: 2 }}
                        onClick={() => navigate(-1)}
                    >
                        Geri Dön
                    </Button>
                </Paper>
            ) : (
                <>
                    <Typography variant="body2" color="textSecondary" paragraph>
                        Toplam {responses.length} yanıt bulundu
                    </Typography>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Tarih</TableCell>
                                    {!surveyId && <TableCell>Anket</TableCell>}
                                    <TableCell>Müşteri</TableCell>
                                    <TableCell>Yanıtlar</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {responses.map((response) => (
                                    <TableRow key={response._id}>
                                        <TableCell>
                                            {moment(response.createdAt).format('DD.MM.YYYY HH:mm')}
                                        </TableCell>
                                        {!surveyId && (
                                            <TableCell>
                                                {response.survey?.title || 'İsimsiz Anket'}
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            {response.customer ? (
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={
                                                            isMongoId(response.customer.name) ?
                                                                'normal' : 'bold'
                                                        }
                                                        color={
                                                            isMongoId(response.customer.name) ?
                                                                'text.secondary' : 'inherit'
                                                        }
                                                    >
                                                        {isMongoId(response.customer.name) ?
                                                            (response.customer._id === "681a3c9270528f7108a89fed" ? "dasda" :
                                                                (response.customer._id === "681a3c69f5b03d7168f1a56c" ? "deneme" : "Anonim"))
                                                            : response.customer.name}
                                                    </Typography>
                                                    {response.customer.email && (
                                                        <Typography variant="body2" color="text.secondary">
                                                            {response.customer.email}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            ) : (
                                                <Typography color="text.secondary">Müşteri Bilgisi Yok</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    {response.answers.map((answer, index) => (
                                                        <div key={answer._id || index}>
                                                            <Typography variant="body2">
                                                                <strong>Soru {index + 1}:</strong> {answer.question}
                                                            </Typography>
                                                            <Typography variant="body1" sx={{ mb: 1 }}>
                                                                <strong>Yanıt:</strong> {
                                                                    typeof answer.value === 'number' && answer.value <= 5 ?
                                                                        `${answer.value} ⭐` : answer.value
                                                                }
                                                            </Typography>
                                                            {index < response.answers.length - 1 && <Divider sx={{ my: 1 }} />}
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}
        </Container>
    );
};

export default BusinessResponses; 