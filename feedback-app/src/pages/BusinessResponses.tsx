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
    Button,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
    Chip,
    Snackbar
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { surveyService } from '../services/surveyService';
import apiService from '../services/api';
// @ts-ignore
import moment from 'moment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DeleteIcon from '@mui/icons-material/Delete';

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
    userId?: {
        _id: string;
        name: string;
        email: string;
    } | string; // Hem popüle edilmiş nesne hem de string olabilir
    customerName?: string; // Eski API yanıtları için geriye dönük uyumluluk
    customerEmail?: string; // Eski API yanıtları için geriye dönük uyumluluk
    createdAt: string;
    rewardPoints?: number;
    pointsApproved?: boolean;
}

// MongoDB ObjectID formatını kontrol eden yardımcı fonksiyon
const isMongoId = (value: string): boolean => {
    if (!value) return false;
    // Eğer değer bir kullanıcı tarafından girildiği belli olan bir string ise, MongoDB ID olarak işaretlemeyelim
    if (value.includes(" ") || // Boşluk içeren isimler
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
    const [openApproveDialog, setOpenApproveDialog] = useState(false);
    const [selectedResponse, setSelectedResponse] = useState<ResponseData | null>(null);
    const [approvedPoints, setApprovedPoints] = useState<number>(0);
    const [operationLoading, setOperationLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    // Tüm anketlerin başlıklarını saklamak için global bir harita oluşturuyoruz
    const surveyTitleMap: Record<string, string> = {};

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

            // ANKET BAŞLIK HARİTASINI TEMİZLE - YENİDEN BAŞLAMA NOKTASI
            // Her seferinde haritayı temizleyelim, böylece eski veriler karışmaz
            Object.keys(surveyTitleMap).forEach(key => {
                delete surveyTitleMap[key];
            });
            console.log('💥 Anket başlık haritası temizlendi - yeni yükleme başlıyor');

            // ÖNEMLİ: ÖNCE TÜM İŞLETME ANKETLERİNİ GETİR VE HARİTAYA DOLDUR
            console.log('📚 Önce TÜM işletme anketleri getiriliyor...');
            try {
                const allBusinessSurveys = await surveyService.getBusinessSurveys();
                console.log(`✅ İşletmeye ait ${allBusinessSurveys.length} anket bulundu`);

                // Tüm anket başlıklarını haritaya ekle
                if (Array.isArray(allBusinessSurveys)) {
                    allBusinessSurveys.forEach(survey => {
                        if (survey && survey._id && survey.title) {
                            surveyTitleMap[survey._id] = survey.title;
                            console.log(`📝 Anket başlığı haritaya eklendi: ${survey._id} -> "${survey.title}"`);
                        }
                    });
                }

                console.log(`📊 Toplam ${Object.keys(surveyTitleMap).length} anket başlığı haritaya eklendi`);
                console.log('📋 Anket başlık haritası:', surveyTitleMap);
            } catch (err) {
                console.error('❌ Anketleri getirirken hata:', err);
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

                // ÖNCELİKLE TÜM YANITLARDA ANKET BAŞLIKLARINI DÜZELT
                // Bu adım çok önemli - anket başlıklarını doğrudan güncelliyor
                console.log("⚡ TÜM YANITLARDA BAŞLIK DÜZELTMESİ BAŞLIYOR");
                if (Array.isArray(apiResponses)) {
                    apiResponses.forEach((resp, idx) => {
                        if (!resp || !resp.survey) return;

                        console.log(`Yanıt #${idx + 1} için başlık kontrolü...`);
                        const surveyId = resp.survey._id;
                        const originalTitle = resp.survey.title || '';

                        // Global haritadan başlığı al
                        if (surveyId && surveyTitleMap[surveyId]) {
                            // Eğer API yanıtındaki başlık zaten doğruysa değiştirme
                            if (originalTitle === surveyTitleMap[surveyId]) {
                                console.log(`✅ Başlık zaten doğru: "${originalTitle}"`);
                            } else {
                                // Başlık doğru değilse düzelt
                                resp.survey.title = surveyTitleMap[surveyId];
                                console.log(`🔄 Başlık düzeltildi: "${originalTitle}" -> "${resp.survey.title}"`);
                            }
                        } else {
                            console.log(`⚠️ Anket ID ${surveyId || 'YOK'} için haritada başlık bulunamadı: "${originalTitle}"`);
                        }
                    });
                }

                // Tekrarlanan metni düzeltme yardımcı fonksiyonu
                const fixRepeatedTitle = (title: string): string => {
                    if (title && title.length >= 6) {
                        const halfLength = Math.floor(title.length / 2);
                        const firstHalf = title.substring(0, halfLength);
                        const secondHalf = title.substring(halfLength);

                        if (firstHalf === secondHalf) {
                            console.log(`Tekrarlanan başlık düzeltildi: "${title}" -> "${firstHalf}"`);
                            return firstHalf;
                        }
                    }
                    return title;
                };

                // Soru ID'si -> metin eşleştirmelerini saklamak için ek bir harita oluştur
                const questionTextMap: Record<string, string> = {};

                // Sabit soru metinleri - soru ID'lerine özel eşleştirmeler
                const hardcodedQuestionTexts: Record<string, string> = {
                    "681a3842c370f06545a7619e": "Hizmetimizden ne kadar memnun kaldınız?",
                    "681a3842c370f06545a7619f": "Personelimizin ilgisini nasıl değerlendirirsiniz?"
                };

                // YENİ: Önce tüm yanıtları doğru başlıklarla işaretleme
                apiResponses.forEach(resp => {
                    if (resp?.survey?._id && surveyTitleMap[resp.survey._id]) {
                        // API yanıtına doğru başlığı doğrudan yerleştir
                        resp.survey.title = surveyTitleMap[resp.survey._id];
                        console.log(`API Yanıtında survey başlığı güncellendi: ${resp.survey._id} -> "${resp.survey.title}"`);
                    }
                });

                // surveyData anket dizisi ise (işletme anketleri) veya tek bir anket nesnesi ise
                // anket başlıklarını haritaya ekle
                if (Array.isArray(surveyData)) {
                    surveyData.forEach((survey: any) => {
                        if (survey && survey._id && survey.title) {
                            surveyTitleMap[survey._id] = survey.title;
                            // Global haritaya da ekle
                            console.log(`Anket başlığı haritaya eklendi: ${survey._id} -> "${survey.title}"`);
                        }
                    });
                } else if (surveyData && surveyData._id && surveyData.title) {
                    surveyTitleMap[surveyData._id] = surveyData.title;
                    // Global haritaya da ekle
                    console.log(`Tek anket başlığı haritaya eklendi: ${surveyData._id} -> "${surveyData.title}"`);
                }

                // YENİ: Anket başlık haritasının içeriğini kontrol et
                console.log('Anket başlık haritası:', Object.keys(surveyTitleMap).length, 'adet başlık içeriyor');
                Object.keys(surveyTitleMap).forEach(key => {
                    console.log(`  - Anket: ${key} -> "${surveyTitleMap[key]}"`);
                });

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
                    console.log('API YANIT VERİSİ (İLK YANIT):', JSON.stringify(apiResponses[0], null, 2));

                    // Anket verisi detaylı inceleme
                    console.log('🔍 ANKET VERİSİ DETAYLI İNCELEME:');
                    console.log('Survey alanı:', apiResponses[0]?.survey);
                    if (apiResponses[0]?.survey) {
                        console.log('Survey ID:', apiResponses[0].survey._id);
                        console.log('Survey Title:', apiResponses[0].survey.title);
                        console.log('Survey Description:', apiResponses[0].survey.description);
                    }

                    // Müşteri verisi var mı kontrol et
                    console.log('Customer alanı:', apiResponses[0]?.customer);
                    console.log('User alanı:', apiResponses[0]?.user);
                    console.log('UserId alanı:', apiResponses[0]?.userId);
                    console.log('SubmittedBy alanı:', apiResponses[0]?.submittedBy);

                    // Tüm alanları listele
                    console.log('Mevcut alanlar:', Object.keys(apiResponses[0] || {}));
                }

                return apiResponses.map((resp: any, index) => {
                    console.log(`İşlenen yanıt #${index + 1}:`, resp);

                    // Eksik anket ID'sini düzeltme girişimi - yanıt verilerinden bulma
                    const extractedSurveyId =
                        resp.survey?._id || // Direkt survey._id
                        (resp.answers && resp.answers.length > 0 && resp.answers[0].questionId) || // Yanıtlardaki soru ID'sinden
                        (resp.answers && resp.answers.length > 0 && resp.answers[0].question?._id) || // Yanıttaki soru nesnesinden
                        (resp.answers && resp.answers.length > 0 && resp.answers[0].question) || ''; // Yanıttaki soru string ID'sinden

                    // 1. Anket bilgisini hazırla - null kontrolü ekle
                    const surveyInfo = resp?.survey || surveyData || {};

                    // Eğer anket başlığında tekrarlama varsa düzelt
                    if (resp.survey && resp.survey.title) {
                        const originalTitle = resp.survey.title;
                        resp.survey.title = fixRepeatedTitle(originalTitle);
                        if (originalTitle !== resp.survey.title) {
                            console.log('📝 Anket başlığı düzeltildi:', originalTitle, '->', resp.survey.title);
                        }
                    }

                    // Anket bilgilerinin doğruluğunu kontrol et
                    console.log('Anket Verisi İnceleme:', {
                        respSurvey: resp?.survey || 'Yok',
                        surveyData: surveyData || 'Yok',
                        mergedSurvey: surveyInfo || 'Yok'
                    });

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

                        console.log('Hiçbir kullanıcı adı bulunamadı, İsimsiz Müşteri kullanılacak');
                        return "İsimsiz Müşteri";
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
                        finalCustomerName = "İsimsiz Müşteri";
                        console.log("İsim bulunamadı, 'İsimsiz Müşteri' kullanılıyor");
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

                    // Müşteri veri işleme kodunu güncelleyelim
                    // Tek bir yanıtı standardize et
                    console.log(`${index + 1}. YANIT CUSTOMER DEĞER TİPİ:`, typeof resp.customer);
                    console.log(`${index + 1}. YANIT CUSTOMER İÇERİĞİ:`, resp.customer);
                    console.log(`${index + 1}. YANIT CUSTOMER NAME:`, resp.customer?.name);

                    // API yanıtında survey nesnesi yoksa oluşturalım
                    if (!resp.survey) {
                        console.log('API yanıtında survey nesnesi yok, oluşturuluyor');
                        resp.survey = {
                            _id: surveyId || extractedSurveyId || '',
                            title: '',  // Varsayılan değer olarak boş string kullan
                            description: ''
                        };
                    }

                    // API'den gelen anket başlığını logla
                    console.log('⭐ API YANITI ANKET BAŞLIĞI:', resp.survey?.title || 'Başlık yok');

                    // StandardizeResponses dönüş değeri
                    const standardizedResponse = {
                        _id: resp._id || resp.id || '',
                        survey: {
                            _id: resp.survey?._id || surveyInfo?._id || '',
                            // Anket başlığı öncelik sırası:
                            // 1. Global haritamızdan başlık varsa onu kullan 
                            // 2. Yoksa API'den gelen başlık (eğer Yanıt Formu değilse)
                            // 3. Son çare olarak ID'den kısaltılmış bir başlık üret
                            title: (resp.survey?._id && surveyTitleMap[resp.survey._id]) ?
                                surveyTitleMap[resp.survey._id] :
                                (resp.survey?.title && resp.survey.title !== 'Yanıt Formu' && resp.survey.title !== 'denemedeneme') ?
                                    fixRepeatedTitle(resp.survey.title) :
                                    (resp.survey?._id ? `Anket #${resp.survey._id.substring(0, 8)}` : 'Bilinmeyen Anket'),
                            description: resp.survey?.description || surveyInfo?.description || ''
                        },
                        answers: processedAnswers,
                        // Eğer apiden gelen bir customer nesnesi varsa, doğrudan onu kullan
                        customer: typeof resp.customer === 'object' ? resp.customer : {
                            _id: customerId,
                            name: resp.customerName || finalCustomerName,
                            email: resp.customerEmail || finalCustomerEmail
                        },
                        // Geriye dönük uyumluluk için customerName ve customerEmail alanlarını da sakla
                        customerName: resp.customerName || (resp.customer && typeof resp.customer === 'object' ? resp.customer.name : finalCustomerName),
                        customerEmail: resp.customerEmail || (resp.customer && typeof resp.customer === 'object' ? resp.customer.email : finalCustomerEmail),
                        createdAt: resp.createdAt || new Date().toISOString(),
                        rewardPoints: resp.rewardPoints,
                        pointsApproved: resp.pointsApproved
                    };

                    console.log(`${index + 1}. YANIT STANDARDİZE EDİLMİŞ CUSTOMER:`, standardizedResponse.customer);
                    console.log(`${index + 1}. YANIT STANDARDİZE EDİLMİŞ ANKET:`, standardizedResponse.survey);

                    return standardizedResponse;
                });
            };

            // ********** VERİ ALMA İŞLEMLERİ **********

            let responseData: ResponseData[] = [];

            if (surveyId) {
                // Önce anketi al
                const surveyData = await surveyService.getSurvey(surveyId);
                setSurvey(surveyData);
                console.log('Anket verileri alındı:', surveyData);

                // Anket başlığını haritaya ekle
                if (surveyData && surveyData._id && surveyData.title) {
                    surveyTitleMap[surveyData._id] = surveyData.title;
                    console.log(`Anket başlığı haritaya eklendi: ${surveyData._id} -> "${surveyData.title}"`);
                }

                // Sonra yanıtları al
                const apiResponses = await surveyService.getSurveyResponses(surveyId);
                console.log('API anket yanıtları alındı:', apiResponses);

                // Yanıtları standarize et
                responseData = standardizeResponses(apiResponses, surveyData);
            } else {
                // ÇOK ÖNEMLİ: Önce tüm işletme anketlerini al
                console.log('Tüm işletme anketleri getiriliyor...');
                const allBusinessSurveys = await surveyService.getBusinessSurveys();
                console.log('İşletmenin tüm anketleri alındı:', allBusinessSurveys);

                // Tüm anket başlıklarını haritaya ekle
                if (Array.isArray(allBusinessSurveys)) {
                    allBusinessSurveys.forEach(survey => {
                        if (survey && survey._id && survey.title) {
                            surveyTitleMap[survey._id] = survey.title;
                            console.log(`Anket başlığı haritaya eklendi: ${survey._id} -> "${survey.title}"`);
                        }
                    });
                }

                // YENİ: Tüm anket ID'leri için haritada başlık olduğunu kontrol et
                console.log('Anket başlık haritası:', Object.keys(surveyTitleMap).length, 'adet anket başlığı bulundu');

                // Sonra işletme yanıtlarını al
                const apiResponses = await surveyService.getBusinessResponses(userBusinessId);
                console.log('API işletme yanıtları alındı:', apiResponses.length, 'adet yanıt');

                // ÖNEMLİ: API yanıtlarında anket başlıklarını doğrudan güncelleyelim
                console.log("🔍 API YANITLARINDA BAŞLIK DÜZELTMESİ YAPILIYOR...");
                if (Array.isArray(apiResponses)) {
                    let başlıkDüzeltmeCount = 0;
                    apiResponses.forEach(resp => {
                        if (resp && resp.survey && resp.survey._id) {
                            const surveyId = resp.survey._id;
                            console.log(`Yanıt ID: ${resp._id || 'bilinmiyor'}, Survey ID: ${surveyId}`);
                            console.log(`Orijinal başlık: "${resp.survey.title || 'Başlık yok'}"`);

                            // 1. Eğer başlık boş veya Yanıt Formu ise
                            if (!resp.survey.title || resp.survey.title === 'Yanıt Formu' || resp.survey.title === 'denemedeneme') {
                                console.log('🔴 Yanıtta geçersiz başlık tespit edildi:', resp.survey.title);

                                // Haritada başlık var mı?
                                if (surveyTitleMap[surveyId]) {
                                    resp.survey.title = surveyTitleMap[surveyId];
                                    console.log(`🟢 Başlık düzeltildi: -> "${resp.survey.title}"`);
                                    başlıkDüzeltmeCount++;
                                } else {
                                    console.log('⚠️ Haritada bu ID için başlık bulunamadı!');
                                }
                            } else {
                                console.log('✅ Geçerli başlık var, değişiklik yok');
                            }
                        } else {
                            console.log('⚠️ Bu yanıtta geçerli bir survey nesnesi yok!');
                        }
                    });
                    console.log(`🔄 Toplam ${başlıkDüzeltmeCount} adet başlık düzeltildi`);
                }

                // İlk yanıtı detaylı incele
                if (Array.isArray(apiResponses) && apiResponses.length > 0) {
                    console.log('------ İLK YANIT DETAYLI İNCELEME ------');
                    console.log('Ham veri:', JSON.stringify(apiResponses[0], null, 2));

                    // Anket verisi detaylı inceleme
                    console.log('🔍 ANKET VERİSİ DETAYLI İNCELEME:');
                    console.log('Survey alanı:', apiResponses[0]?.survey);
                    if (apiResponses[0]?.survey) {
                        console.log('Survey ID:', apiResponses[0].survey._id);
                        console.log('Survey Title:', apiResponses[0].survey.title);
                        console.log('Survey Description:', apiResponses[0].survey.description);
                    }

                    // YENİ: Haritada bir başlık var mı kontrol et
                    if (apiResponses[0]?.survey?._id) {
                        const surveyId = apiResponses[0].survey._id;
                        console.log(`Anket ID'si ${surveyId} için haritada başlık var mı:`, !!surveyTitleMap[surveyId]);
                        if (surveyTitleMap[surveyId]) {
                            console.log(`Haritada bulunan başlık: "${surveyTitleMap[surveyId]}"`);
                        }
                    }
                }

                // Tüm yanıtlara ait benzersiz anket ID'lerini bul
                const uniqueSurveyIds = Array.isArray(apiResponses)
                    ? Array.from(new Set(
                        apiResponses
                            .filter(resp => resp && resp.survey && resp.survey._id)
                            .map(resp => resp.survey._id)
                    ))
                    : [];
                console.log('Benzersiz anket ID\'leri:', uniqueSurveyIds);

                // Anket verisinin yapısını detaylı incele
                if (allBusinessSurveys && allBusinessSurveys.length > 0) {
                    console.log('🔍 İŞLETME ANKETLERİ DETAYLI İNCELEME:');
                    allBusinessSurveys.forEach((survey, index) => {
                        console.log(`Anket #${index + 1}:`, {
                            id: survey._id,
                            title: survey.title,
                            description: survey.description || 'Açıklama yok'
                        });
                    });
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
                responseData = Array.isArray(apiResponses)
                    ? apiResponses.map((resp, index) => {
                        // Güvenli null kontrolleri ekleyelim
                        const surveyId = resp?.survey?._id;

                        // YENİ: Eğer anket ID'si haritada varsa, başlığı doğrudan güncelle
                        if (surveyId && surveyTitleMap[surveyId]) {
                            // API yanıtındaki survey nesnesine doğru başlığı doğrudan yerleştir
                            if (!resp.survey) {
                                resp.survey = { _id: surveyId, title: '', description: '' };
                            }
                            // Haritadaki başlığı kullan - en önemli adım burada!
                            resp.survey.title = surveyTitleMap[surveyId];
                            console.log(`Survey başlığı haritadan enjekte edildi: ${surveyId} -> "${resp.survey.title}"`);
                        }

                        // Eksik anket ID'sini düzeltme girişimi - yanıt verilerinden bulma
                        const extractedSurveyId =
                            resp.survey?._id || // Direkt survey._id
                            (resp.answers && resp.answers.length > 0 && resp.answers[0].questionId) || // Yanıtlardaki soru ID'sinden
                            (resp.answers && resp.answers.length > 0 && resp.answers[0].question?._id) || // Yanıttaki soru nesnesinden
                            (resp.answers && resp.answers.length > 0 && resp.answers[0].question); // Yanıttaki soru string ID'sinden

                        // Soru ID'sinden anket ID'si çıkarma - genellikle aynı prefixi paylaşırlar
                        // Örn: 68274c5b5b7daef1b36b4151 (soru) -> 68274c5b5b7daef1b36b4150 (anket) olabilir
                        const possibleSurveyId = extractedSurveyId?.substring(0, 20);

                        console.log('Survey ID arama:', {
                            direktId: surveyId,
                            extractedId: extractedSurveyId,
                            possibleId: possibleSurveyId
                        });

                        // Anket detaylarını haritadan bul - daha esnek eşleştirme algoritması
                        let surveyDetails = null;

                        // 1. Doğrudan ID eşleşmesi
                        if (surveyId && surveyDetailsMap[surveyId]) {
                            surveyDetails = surveyDetailsMap[surveyId];
                            console.log(`✅ Direkt ID ile anket bulundu: "${surveyDetails.title}"`);
                        }
                        // 2. Çıkarılan ID ile eşleşme
                        else if (extractedSurveyId && surveyDetailsMap[extractedSurveyId]) {
                            surveyDetails = surveyDetailsMap[extractedSurveyId];
                            console.log(`✅ Çıkarılan ID ile anket bulundu: "${surveyDetails.title}"`);
                        }
                        // 3. Partial ID eşleşmesi
                        else {
                            // Tüm anketleri dönerek partial ID eşleşmesi ara
                            surveyDetails = Object.values(surveyDetailsMap).find(survey => {
                                if (!survey || !survey._id) return false;

                                // ID başlangıç eşleşmesi kontrol et
                                if (possibleSurveyId && survey._id.startsWith(possibleSurveyId)) {
                                    return true;
                                }

                                // Soru ID'leri ile eşleşmelerini kontrol et
                                if (survey.questions && Array.isArray(survey.questions)) {
                                    return survey.questions.some((q: any) => {
                                        const qId = q._id || q.id;
                                        return extractedSurveyId === qId ||
                                            (extractedSurveyId && qId && qId.startsWith(extractedSurveyId.substring(0, 20)));
                                    });
                                }

                                return false;
                            });

                            if (surveyDetails) {
                                console.log(`✅ Genişletilmiş arama ile anket bulundu: "${surveyDetails.title}"`);
                            }
                        }

                        // Bulunamazsa ve başka anketler varsa ilk anketi kullan
                        if (!surveyDetails && allBusinessSurveys?.length > 0) {
                            surveyDetails = allBusinessSurveys[0];
                            console.log(`⚠️ Anket bulunamadı, ilk anket kullanılıyor: "${surveyDetails.title}"`);
                        }

                        if (surveyDetails) {
                            console.log(`🎯 Yanıt için anket bulundu: "${surveyDetails.title}"`);
                        }

                        // Ham yanıt verilerini detaylı incele
                        console.log('ANALİZ - Ham yanıt verisi:', resp);

                        if (resp.survey) {
                            console.log('ANALİZ - Survey verisi mevcut:', {
                                surveyId: resp.survey._id,
                                title: resp.survey.title,
                                description: resp.survey.description
                            });
                        } else {
                            console.log('ANALİZ - Survey verisi YOK!');
                        }

                        // ÇOK ÖNEMLİ: 
                        // Eğer bu yanıt gerçekten bir ankete aitse, 
                        // ama anket bilgisi yoksa veya eksikse:
                        // Survey ID'yi anketten doğrudan alıyoruz
                        if (!resp.survey || !resp.survey.title) {
                            // Tüm anketleri tarayarak ID'ye göre eşleşme ara
                            const matchingSurvey = allBusinessSurveys.find((survey: any) => {
                                return survey._id === surveyId || survey._id === extractedSurveyId;
                            });

                            if (matchingSurvey) {
                                console.log('✅ Tam ID eşleşmesi ile anket bulundu:', matchingSurvey.title);

                                // Anket bilgisini API yanıtına direkt ekliyoruz
                                resp.survey = {
                                    _id: matchingSurvey._id,
                                    title: matchingSurvey.title || '',
                                    description: matchingSurvey.description || ''
                                };
                            }
                            else {
                                // Kısmi ID eşleşmesi
                                for (const survey of allBusinessSurveys) {
                                    // Güvenli tip kontrolü
                                    if (!survey || !survey._id || !extractedSurveyId) continue;

                                    const surveyIdStr = String(survey._id);
                                    const extractedIdStr = String(extractedSurveyId);

                                    if (surveyIdStr.startsWith(extractedIdStr.substring(0, 16))) {
                                        console.log('✅ Kısmi ID eşleşmesi ile anket bulundu:', survey.title);
                                        resp.survey = {
                                            _id: survey._id,
                                            title: survey.title || '',
                                            description: survey.description || ''
                                        };
                                        break;
                                    }
                                }
                            }
                        }

                        // API yanıtında survey nesnesi yoksa oluşturalım ama başlık olarak boş string kullan
                        if (!resp.survey) {
                            console.log('API yanıtında survey nesnesi yok, oluşturuluyor');
                            resp.survey = {
                                _id: surveyId || extractedSurveyId || '',
                                title: '',  // Varsayılan değer olarak boş string kullan
                                description: ''
                            };
                        }

                        // API'den gelen anket başlığını logla
                        console.log('⭐ API YANITI ANKET BAŞLIĞI:', resp.survey?.title || 'Başlık yok');

                        // Eğer haritada bu anket için başlık varsa ve şu anki başlık boş veya Yanıt Formu ise, haritadan al
                        if (resp.survey._id && surveyTitleMap[resp.survey._id] &&
                            (!resp.survey.title || resp.survey.title === 'Yanıt Formu')) {
                            resp.survey.title = surveyTitleMap[resp.survey._id];
                            console.log(`Anket başlığı haritadan enjekte edildi: ${resp.survey._id} -> "${resp.survey.title}"`);
                        }

                        // Tek bir yanıtı standardize et
                        const standardizedResp = standardizeResponses([resp], surveyDetails)[0];
                        console.log('Standardize edilmiş yanıt:', standardizedResp);

                        // Standardize edilmiş yanıt içindeki anket başlığını kontrol et ve logla
                        console.log('📋 Standardize edilmiş anket başlığı:', standardizedResp.survey?.title || 'Başlık yok');

                        return standardizedResp;
                    })
                    : [];
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

    // Puan onaylama/reddetme dialogunu aç
    const handleOpenApproveDialog = (response: ResponseData) => {
        setSelectedResponse(response);
        setApprovedPoints(response.rewardPoints || 0);
        setOpenApproveDialog(true);
    };

    // Dialogu kapat
    const handleCloseApproveDialog = () => {
        setSelectedResponse(null);
        setOpenApproveDialog(false);
        setApprovedPoints(0);
    };

    // Puanları onayla
    const handleApprovePoints = async () => {
        if (!selectedResponse) return;

        try {
            console.log('🔍 Puan onaylama işlemi başlatılıyor - Yanıt ID:', selectedResponse._id);
            console.log('Onaylanacak puan değeri:', approvedPoints);

            setOperationLoading(true);

            // API isteği göndermeden önce debug
            console.log('API çağrısı URL:', `/surveys/responses/${selectedResponse._id}/approve-points`);
            console.log('API çağrısı veri:', { approvedPoints });

            try {
                const response = await apiService.patch(`/surveys/responses/${selectedResponse._id}/approve-points`, {
                    approvedPoints
                });

                console.log('✅ API yanıtı alındı:', response.data);

                if (response.data && response.data.success) {
                    // İşlem başarılı, onaylayan ve tarih bilgilerini göster
                    const approvedByName = response.data.data.approvedBy || 'Sistem';
                    const approvedDate = new Date(response.data.data.approvedAt).toLocaleString('tr-TR');

                    setSuccessMessage(`Puanlar başarıyla onaylandı. Onaylayan: ${approvedByName}, Tarih: ${approvedDate}`);
                    fetchResponses(); // Yanıtları yeniden yükle
                    handleCloseApproveDialog();
                } else {
                    const errorMsg = response.data?.message || 'Puanlar onaylanırken beklenmeyen bir yanıt alındı';
                    console.error('❌ API başarılı ancak işlem başarısız:', errorMsg);
                    setError(errorMsg);
                }
            } catch (apiError: any) {
                console.error('❌ API çağrısı sırasında hata:', apiError);
                console.error('Hata detayları:', {
                    message: apiError.message,
                    status: apiError.response?.status,
                    statusText: apiError.response?.statusText,
                    responseData: apiError.response?.data,
                });

                // Status 500 için daha anlamlı hata mesajları
                if (apiError.response?.status === 500) {
                    setError('Sunucu hatası: İşlem sırasında beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
                } else {
                    setError(apiError.response?.data?.message || apiError.message || 'Puanlar onaylanırken bir hata oluştu');
                }
            }
        } catch (err: any) {
            console.error('❌ Genel puan onaylama hatası:', err);
            setError(err.message || 'Puanlar onaylanırken bir hata oluştu');
        } finally {
            setOperationLoading(false);
        }
    };

    // Puanları reddet
    const handleRejectPoints = async () => {
        if (!selectedResponse) return;

        try {
            console.log('🔍 Puan reddetme işlemi başlatılıyor - Yanıt ID:', selectedResponse._id);

            setOperationLoading(true);

            // API isteği göndermeden önce debug
            console.log('API çağrısı URL:', `/surveys/responses/${selectedResponse._id}/reject-points`);

            // API çağrısı için veri hazırla
            const rejectData = {
                responseId: selectedResponse._id,
                confirmed: true
            };

            console.log('🔧 API PATCH isteği başlatılıyor:', `/surveys/responses/${selectedResponse._id}/reject-points`);
            console.log('PATCH Verileri:', rejectData);

            try {
                const response = await apiService.patch(`/surveys/responses/${selectedResponse._id}/reject-points`, rejectData);

                console.log('✅ API yanıtı alındı:', response.data);

                if (response.data && response.data.success) {
                    // İşlem başarılı, reddeden ve tarih bilgilerini göster
                    const rejectedByName = response.data.data.rejectedBy || 'Sistem';
                    const rejectedDate = new Date(response.data.data.rejectedAt).toLocaleString('tr-TR');

                    setSuccessMessage(`Puanlar başarıyla reddedildi. Reddeden: ${rejectedByName}, Tarih: ${rejectedDate}`);
                    fetchResponses(); // Yanıtları yeniden yükle
                    handleCloseApproveDialog();
                } else {
                    const errorMsg = response.data?.message || 'Puanlar reddedilirken beklenmeyen bir yanıt alındı';
                    console.error('❌ API başarılı ancak işlem başarısız:', errorMsg);
                    setError(errorMsg);
                }
            } catch (apiError: any) {
                console.error('❌ API çağrısı sırasında hata:', apiError);
                console.error('Hata detayları:', {
                    message: apiError.message,
                    status: apiError.response?.status,
                    statusText: apiError.response?.statusText,
                    responseData: apiError.response?.data,
                    requestData: rejectData
                });

                // Status 500 için daha anlamlı hata mesajları
                if (apiError.response?.status === 500) {
                    setError('Sunucu hatası: İşlem sırasında beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
                } else if (apiError.response?.status === 400) {
                    setError(`Hata: ${apiError.response?.data?.message || 'Geçersiz istek formatı'}. Lütfen tekrar deneyin.`);
                } else {
                    setError(apiError.response?.data?.message || apiError.message || 'Puanlar reddedilirken bir hata oluştu');
                }
            }
        } catch (err: any) {
            console.error('❌ Genel puan reddetme hatası:', err);
            setError(err.message || 'Puanlar reddedilirken bir hata oluştu');
        } finally {
            setOperationLoading(false);
        }
    };

    // Yanıt silme onay dialogunu aç
    const handleOpenDeleteDialog = (response: ResponseData) => {
        setSelectedResponse(response);
        setOpenDeleteDialog(true);
    };

    // Yanıt silme dialogunu kapat
    const handleCloseDeleteDialog = () => {
        setSelectedResponse(null);
        setOpenDeleteDialog(false);
    };

    // Yanıtı sil
    const handleDeleteResponse = async () => {
        if (!selectedResponse) return;

        try {
            console.log('🗑️ Yanıt silme işlemi başlatılıyor - Yanıt ID:', selectedResponse._id);

            setOperationLoading(true);

            // API isteği göndermeden önce debug
            console.log('API çağrısı URL:', `/surveys/responses/${selectedResponse._id}`);

            try {
                const response = await apiService.delete(`/surveys/responses/${selectedResponse._id}`);

                console.log('✅ API yanıtı alındı:', response.data);

                if (response.data && response.data.success) {
                    // İşlem başarılı, silen kişi ve tarih bilgilerini göster
                    const deletedByName = response.data.data.deletedBy || 'Sistem';
                    const deletedDate = new Date(response.data.data.deletedAt).toLocaleString('tr-TR');

                    setSuccessMessage(`Yanıt başarıyla silindi. Silen: ${deletedByName}, Tarih: ${deletedDate}`);
                    fetchResponses(); // Yanıtları yeniden yükle
                    handleCloseDeleteDialog();
                } else {
                    const errorMsg = response.data?.message || 'Yanıt silinirken beklenmeyen bir yanıt alındı';
                    console.error('❌ API başarılı ancak işlem başarısız:', errorMsg);
                    setError(errorMsg);
                }
            } catch (apiError: any) {
                console.error('❌ API çağrısı sırasında hata:', apiError);
                console.error('Hata detayları:', {
                    message: apiError.message,
                    status: apiError.response?.status,
                    statusText: apiError.response?.statusText,
                    responseData: apiError.response?.data
                });

                if (apiError.response?.status === 403) {
                    setError('Hata: Bu yanıtı silme yetkiniz bulunmamaktadır.');
                } else if (apiError.response?.status === 404) {
                    setError('Hata: Yanıt bulunamadı. Muhtemelen daha önce silinmiş olabilir.');
                } else if (apiError.response?.status === 500) {
                    setError('Sunucu hatası: İşlem sırasında beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
                } else {
                    setError(apiError.response?.data?.message || apiError.message || 'Yanıt silinirken bir hata oluştu');
                }
            }
        } catch (err: any) {
            console.error('❌ Genel yanıt silme hatası:', err);
            setError(err.message || 'Yanıt silinirken bir hata oluştu');
        } finally {
            setOperationLoading(false);
        }
    };

    // Başarı ve hata mesajlarını kapat
    const handleCloseAlert = () => {
        setSuccessMessage(null);
        setError('');
    };

    // İşlenmiş API yanıtlarını tabloda göstermede müşteri bilgilerini kullanma
    const renderCustomerCell = (response: ResponseData) => {
        // Debug log
        console.log('🧑 Müşteri hücresi oluşturuluyor, yanıt ID:', response._id);
        console.log('🧑 Customer verisi:', response.customer);
        console.log('🧑 userId verisi:', response.userId);
        console.log('🧑 customerName değeri:', response.customerName);

        // Müşteri adı için önceliklendirme stratejisi
        let displayName = '';
        let displayEmail = '';
        let displayDetails = '';
        let displayColor = 'text.secondary';

        // 1. En yüksek öncelik: userId nesnesi (populate edilmiş kullanıcı)
        if (response.userId && typeof response.userId === 'object' && response.userId.name) {
            displayName = response.userId.name;
            displayEmail = response.userId.email || '';
            displayDetails = 'Kayıtlı kullanıcı';
            displayColor = 'success.main';
            console.log('✅ Populate edilmiş kullanıcı bilgisi kullanıldı:', displayName);
        }
        // 2. Öncelik: customer nesnesi (response.customer)
        else if (response.customer && typeof response.customer === 'object' && response.customer.name) {
            displayName = response.customer.name;
            displayEmail = response.customer.email || '';

            // Sadece anonim müşteri olup olmadığını kontrol et
            if (!displayName.includes('Anonim')) {
                displayDetails = 'Kayıtlı müşteri';
                displayColor = 'info.main';
            } else {
                displayDetails = 'Ziyaretçi';
                displayColor = 'text.secondary';
            }

            console.log('✅ Müşteri nesnesi (customer) verisi kullanıldı:', displayName);
        }
        // 3. Öncelik: customerName alanı (geriye dönük uyumluluk için)
        else if (response.customerName && response.customerName.trim()) {
            displayName = response.customerName;
            displayEmail = response.customerEmail || '';

            if (!displayName.includes('Anonim')) {
                displayDetails = 'Form bilgisi';
                displayColor = 'text.primary';
            } else {
                displayDetails = 'Ziyaretçi';
                displayColor = 'text.secondary';
            }

            console.log('✅ customerName verisi kullanıldı:', displayName);
        }
        // Hiçbir bilgi bulunamazsa
        else {
            displayName = 'İsimsiz Müşteri';
            displayDetails = 'Bilgi yok';
            console.log('⚠️ Herhangi bir müşteri bilgisi bulunamadı');
        }

        // Son durumda hangi müşteri bilgisinin kullanıldığını logla
        console.log(`🧑 Son müşteri bilgisi: isim=${displayName}, detay=${displayDetails}`);

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body1" component="div" fontWeight="medium">
                    {displayName}
                </Typography>
                {displayEmail && (
                    <Typography variant="caption" color="text.secondary">
                        {displayEmail}
                    </Typography>
                )}
                <Typography variant="caption" sx={{
                    fontStyle: displayDetails === 'Bilgi yok' ? 'italic' : 'normal',
                    color: displayColor
                }}>
                    {displayDetails}
                </Typography>
            </Box>
        );
    };

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
                {surveyId ?
                    (survey && survey.title ? `'${survey.title}' için Yanıtlar` : 'Ankete Ait Yanıtlar')
                    : 'Tüm Anket Yanıtları'}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={handleCloseAlert}>
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert severity="success" sx={{ mb: 3 }} onClose={handleCloseAlert}>
                    {successMessage}
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
                                    <TableCell align="center">Ödül Puanları</TableCell>
                                    <TableCell align="center">İşlemler</TableCell>
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
                                                <Typography
                                                    variant="body1"
                                                    style={{
                                                        color: '#1976d2',
                                                        fontWeight: 700,
                                                        fontSize: '16px',
                                                        borderBottom: '2px solid #1976d2',
                                                        display: 'inline-block',
                                                        paddingBottom: '2px'
                                                    }}
                                                >
                                                    {response.survey?._id && surveyTitleMap[response.survey._id] ? (
                                                        <>{surveyTitleMap[response.survey._id]}</>
                                                    ) : response.survey?.title && response.survey.title !== 'Yanıt Formu' && response.survey.title !== 'denemedeneme' ? (
                                                        <>{response.survey.title}</>
                                                    ) : (
                                                        <span style={{ color: '#f44336' }}>Anket {response.survey?._id ? `#${response.survey._id.substring(0, 8)}` : 'bilgisi bulunamadı'}</span>
                                                    )}
                                                </Typography>
                                                {response.survey?.description && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {response.survey.description.length > 40
                                                            ? `${response.survey.description.substring(0, 40)}...`
                                                            : response.survey.description}
                                                    </Typography>
                                                )}
                                                {/* Anket ID'sini debug için göster */}
                                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '9px', mt: 1 }}>
                                                    ID: {response.survey?._id || 'Yok'}
                                                </Typography>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            {renderCustomerCell(response)}
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
                                        <TableCell align="center">
                                            {response.pointsApproved === true ? (
                                                <Chip
                                                    icon={<EmojiEventsIcon />}
                                                    label={`${response.rewardPoints || 0} Puan (Onaylandı)`}
                                                    color="success"
                                                    variant="outlined"
                                                />
                                            ) : response.pointsApproved === false ? (
                                                <Chip
                                                    icon={<CancelIcon />}
                                                    label="Reddedildi"
                                                    color="error"
                                                    variant="outlined"
                                                />
                                            ) : (
                                                <Chip
                                                    icon={<EmojiEventsIcon />}
                                                    label={`${response.rewardPoints || 0} Puan (Bekliyor)`}
                                                    color="warning"
                                                    variant="outlined"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            {response.pointsApproved !== true && response.pointsApproved !== false && (
                                                <Tooltip title="Puanları Yönet">
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => handleOpenApproveDialog(response)}
                                                    >
                                                        <CheckCircleIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Yanıtı Sil">
                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleOpenDeleteDialog(response)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}

            {/* Puan Onaylama Dialog */}
            <Dialog open={openApproveDialog} onClose={handleCloseApproveDialog}>
                <DialogTitle>Ödül Puanlarını Yönet</DialogTitle>
                <DialogContent>
                    {selectedResponse && (
                        <>
                            <DialogContentText sx={{ mb: 2 }}>
                                <b>
                                    {selectedResponse.customer?.name ||
                                        selectedResponse.customerName ||
                                        'İsimsiz Müşteri'}
                                </b>
                                {' adlı müşterinin '}
                                <b>{selectedResponse.survey?.title || ''}</b>
                                {' anketine yanıtı için ödül puanlarını yönetin.'}
                            </DialogContentText>

                            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                    Müşteri Bilgileri:
                                </Typography>
                                <Typography variant="body2">
                                    <b>Ad:</b> {selectedResponse.customer?.name ||
                                        selectedResponse.customerName ||
                                        'İsimsiz Müşteri'}
                                </Typography>
                                {(selectedResponse.customer?.email || selectedResponse.customerEmail) && (
                                    <Typography variant="body2">
                                        <b>E-posta:</b> {selectedResponse.customer?.email ||
                                            selectedResponse.customerEmail}
                                    </Typography>
                                )}
                            </Box>
                        </>
                    )}

                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Onaylanacak Puan:
                    </Typography>
                    <TextField
                        fullWidth
                        label="Puan"
                        type="number"
                        value={approvedPoints}
                        onChange={(e) => setApprovedPoints(Math.max(0, parseInt(e.target.value) || 0))}
                        InputProps={{
                            startAdornment: <EmojiEventsIcon sx={{ mr: 1, color: 'gray' }} />,
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseApproveDialog}>İptal</Button>
                    <Button
                        onClick={handleRejectPoints}
                        color="error"
                        disabled={operationLoading}
                    >
                        {operationLoading ? <CircularProgress size={24} /> : "Reddet"}
                    </Button>
                    <Button
                        onClick={handleApprovePoints}
                        variant="contained"
                        color="success"
                        disabled={operationLoading || approvedPoints <= 0}
                    >
                        {operationLoading ? <CircularProgress size={24} /> : "Onayla"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Yanıt Silme Dialog */}
            <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
                <DialogTitle>Yanıtı Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bu yanıtı silmek istediğinize emin misiniz? Bu işlem geri dönülemez.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>İptal</Button>
                    <Button
                        onClick={handleDeleteResponse}
                        color="error"
                        disabled={operationLoading}
                    >
                        {operationLoading ? <CircularProgress size={24} /> : "Sil"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default BusinessResponses; 