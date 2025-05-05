import axios from 'axios';
import { Platform } from 'react-native';

// API için temel URL - backend sunucusunun adresi ve platforma göre otomatik seçim
let BASE_URL = 'http://localhost:5000'; // Varsayılan

// Platform bazlı adres seçimi
if (Platform.OS === 'android') {
    // Android emülatör için özel IP
    BASE_URL = 'http://10.0.2.2:5000';
} else if (Platform.OS === 'ios') {
    // iOS simulatör için localhost
    BASE_URL = 'http://localhost:5000';
}

// İşe yarar olası IP adresleri - Öncelikli olarak bu IP'yi dene
BASE_URL = 'http://172.20.10.2:5000'; // Wi-Fi IP - Gerçek cihazlarda bu IP'yi kullan

// Manuel IP ayarı - bu satırı açarak kendi IP adresinizi kullanabilirsiniz
// BASE_URL = 'http://172.20.10.2:5000'; // Wi-Fi IP - Gerçek cihazlarda bu IP'yi kullanın

// Gerçek cihazlarda test ederken, bilgisayarınızın IP adresi
// İşe yarar olası IP adresleri
const NETWORK_IPS = [
    'http://localhost:5000',      // Lokal geliştirme
    'http://127.0.0.1:5000',      // Localhost
    'http://10.0.2.2:5000',       // Android Emülatör
    'http://172.20.10.2:5000',    // Wi-Fi IP
    'http://192.168.1.100:5000',  // Yaygın ev ağı IP'si
    'http://192.168.1.101:5000',  // Alternatif IP
    'http://192.168.1.102:5000',  // Alternatif IP
    'http://192.168.1.103:5000',  // Alternatif IP
    'http://192.168.1.104:5000',  // Alternatif IP
    'http://192.168.1.105:5000',  // Alternatif IP
    'http://192.168.1.3:5000',    // Yaygın alternatif IP
    'http://192.168.1.4:5000',    // Yaygın alternatif IP
    'http://192.168.1.5:5000',    // Yaygın alternatif IP
    'http://192.168.0.100:5000',  // Alternatif ağ IP
    'http://192.168.0.101:5000',  // Alternatif ağ IP
    'http://192.168.0.102:5000',  // Alternatif ağ IP
    'http://192.168.137.1:5000',  // Alternatif IP
    'http://192.168.56.1:5000',   // VirtualBox IP
];

// Axios istemcisini yapılandırma (önce tanımlanıyor)
const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: 15000, // 15 saniye
});

// Retry mekanizması ekleme - başarısız istekleri tekrar dener
apiClient.interceptors.response.use(undefined, async (error) => {
    const { config, message } = error;

    // Ağ hatası veya timeout hatası olduğunda tekrar dene
    if (message.includes('Network Error') || message.includes('timeout')) {
        console.log('Ağ hatası veya timeout, istek tekrar ediliyor...');

        // Test bağlantısı yap ve çalışan bir URL bul
        const workingUrl = await tryConnectToIP();
        if (workingUrl) {
            console.log(`Çalışan URL (${workingUrl}) ile istek tekrar ediliyor...`);
            apiClient.defaults.baseURL = workingUrl;
            // Yeni URL ile isteği tekrarla
            return apiClient(config);
        }
    }

    // Diğer hatalarda normal hata işleme
    return Promise.reject(error);
});

// API sunucusuna erişilebilir bir IP seçmek için fonksiyon
const tryConnectToIP = async (): Promise<string | null> => {
    console.log("API URL bağlantı kontrolü başlatılıyor...");
    console.log("Mevcut API URL:", BASE_URL);
    console.log("Denenen IP adresleri:", NETWORK_IPS);

    // Önce mevcut URL'yi dene
    try {
        console.log(`Mevcut URL (${BASE_URL}) test ediliyor...`);
        const response = await axios.get(`${BASE_URL}/api/ping`, {
            timeout: 3000,
            validateStatus: () => true,
        });

        if (response.status && response.status < 500) {
            console.log(`✅ Mevcut URL (${BASE_URL}) çalışıyor! Durum kodu: ${response.status}`);
            return BASE_URL;
        } else {
            console.log(`❌ Mevcut URL (${BASE_URL}) yanıt veriyor ancak 5xx hatası aldı:`, response.status);
        }
    } catch (error: any) {
        console.log(`❌ Mevcut URL (${BASE_URL}) test hatası:`, error.message);
    }

    // Diğer IP'leri dene
    for (const ip of NETWORK_IPS) {
        try {
            console.log(`${ip} adresine bağlanmayı deniyorum...`);

            // Hem root hem de ping endpoint'ini dene
            const pingEndpoint = `${ip}/api/ping`;
            const rootEndpoint = `${ip}/`;

            let response: any = null;

            try {
                // Önce ping endpoint'ini dene
                response = await axios.get(pingEndpoint, {
                    timeout: 3000,
                    validateStatus: () => true,
                });
            } catch (pingError) {
                // Ping endpoint'i çalışmazsa root endpoint'i dene
                response = await axios.get(rootEndpoint, {
                    timeout: 3000,
                    validateStatus: () => true,
                });
            }

            console.log(`${ip} yanıt kodu:`, response?.status);

            // Bağlantı başarılıysa (herhangi bir durum kodu dönüyorsa) bu IP'yi kullan
            if (response && response.status && response.status < 500) {
                console.log(`✅ Bağlantı başarılı: ${ip}, durum kodu: ${response.status}`);
                // Global URL'i güncelle
                BASE_URL = ip;
                return ip;
            } else {
                console.log(`❌ ${ip} yanıt veriyor ancak 5xx hatası aldı:`, response?.status);
            }
        } catch (error: any) {
            console.log(`❌ Bağlantı başarısız: ${ip}`, error.message);
        }
    }

    console.log("❌ Hiçbir API URL'si erişilebilir değil. Mevcut URL ile devam ediliyor:", BASE_URL);
    return null;
};

// İlk başlatmada API URL'sini test et ve ayarla
// IIFE (Immediately Invoked Function Expression) kullanıyoruz
(async () => {
    console.log("API URL: İlk başlatma testi yapılıyor");
    try {
        // En yaygın API URL'lerini dene
        const initialIps = [
            Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000', // Emülatör/Simülatör
            'http://172.20.10.2:5000', // Yaygın Wi-Fi IP
            'http://192.168.1.100:5000', // Yaygın ev ağı IP'si
            'http://192.168.0.100:5000', // Alternatif ağ IP
        ];

        for (const ip of initialIps) {
            try {
                console.log(`İlk bağlantı testi: ${ip}...`);
                const response = await axios.get(`${ip}/`, {
                    timeout: 3000,
                    validateStatus: () => true,
                });

                if (response.status < 500) {
                    console.log(`✅ Başarılı bağlantı: ${ip}, durum kodu: ${response.status}`);
                    BASE_URL = ip;
                    apiClient.defaults.baseURL = ip;
                    console.log(`API URL güncellendi: ${BASE_URL}`);
                    break;
                }
            } catch (error) {
                console.log(`❌ Bağlantı başarısız: ${ip}`);
            }
        }
    } catch (error) {
        console.error("API URL başlangıç testi hatası:", error);
    }

    console.log('API URL:', BASE_URL); // Debug için URL'i yazdırma
})();

console.log('API URL:', BASE_URL); // Debug için URL'i yazdırma

// İstek atan fonksiyonlar
const api = {
    // API URL'sini döndüren yardımcı fonksiyon
    getApiUrl: () => BASE_URL,

    // API adresini değiştir
    changeApiUrl: (newUrl: string) => {
        BASE_URL = newUrl;
        apiClient.defaults.baseURL = newUrl;
        console.log('API adresi değiştirildi:', newUrl);
        return { success: true, message: `API adresi değiştirildi: ${newUrl}`, url: newUrl };
    },

    // Farklı IP'leri deneyerek API bağlantısını test et
    testConnection: async () => {
        console.log('API bağlantısı test ediliyor...');
        try {
            const workingIp = await tryConnectToIP();
            if (workingIp) {
                // Çalışan URL bulundu, otomatik olarak değiştir
                BASE_URL = workingIp;
                apiClient.defaults.baseURL = workingIp;
                console.log(`Çalışan API URL bulundu. BASE_URL '${workingIp}' olarak güncellendi.`);
                return { success: true, url: workingIp, message: "Bağlantı başarılı ve API URL güncellendi." };
            }

            // Mevcut URL test edildi, çalışıyor mu?
            try {
                console.log(`Ping testi: ${BASE_URL}`);
                const response = await apiClient.get('/', { timeout: 3000 });
                if (response.status) {
                    return { success: true, url: BASE_URL, message: "Mevcut API URL çalışıyor." };
                }
            } catch (e: any) {
                console.log('Mevcut URL yanıt vermiyor:', e.message);
            }

            return { success: false, url: BASE_URL, message: "Hiçbir API URL'si çalışmıyor." };
        } catch (error: any) {
            console.error('API bağlantı testi hatası:', error);
            return { success: false, url: BASE_URL, message: "API test hatası: " + error.message };
        }
    },

    // API sunucusuna ping atarak çalışıp çalışmadığını kontrol eder
    ping: async () => {
        try {
            console.log(`Ping testi: ${BASE_URL}`);
            // Önce test bağlantısını dene
            const testResult = await api.testConnection();
            if (testResult.success) {
                return { success: true, message: `API sunucusu aktif: ${testResult.url}` };
            }

            // Varsayılan adrese ping atalım
            const response = await apiClient.get('/');
            return { success: true, message: 'API sunucusu aktif' };
        } catch (error) {
            console.error('API sunucusuna bağlanılamadı:', error);
            return { success: false, message: 'API sunucusuna bağlanılamadı' };
        }
    },

    // Kullanıcı girişi
    login: async (email: string, password: string) => {
        try {
            // E-postayı küçük harfe çevir
            const normalizedEmail = email ? email.toLowerCase().trim() : '';
            if (!normalizedEmail) {
                throw new Error('E-posta adresi gereklidir');
            }

            // TEST İÇİN: Sistem admin girişi için özel kontrol
            if (normalizedEmail === 'onurerenejder36@gmail.com' && password === 'ejder3636') {
                console.log('🔑 SuperAdmin testi algılandı: Doğrudan giriş yapılıyor...');
            }

            // Önce API bağlantısını test et
            await api.testConnection();

            console.log('Login isteği gönderiliyor:', `${BASE_URL}/api/auth/login`);
            console.log('Gönderilen veriler:', { email: normalizedEmail, password: password ? '*****' : 'boş' });

            // İstek için zaman ölçümü başlat
            const startTime = new Date().getTime();

            // Debug amaçlı email ve password kontrolü
            console.log('Giriş bilgileri:', {
                email_has_spaces: normalizedEmail.includes(' '),
                email_length: normalizedEmail.length,
                email_trim_length: normalizedEmail.trim().length,
                password_length: password?.length || 0,
                password_trim_length: password?.trim().length || 0,
            });

            const response = await apiClient.post('/api/auth/login', {
                email: normalizedEmail,
                password
            }, {
                timeout: 20000, // 20 saniye timeout (arttırıldı)
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            // İstek için geçen süreyi hesapla
            const endTime = new Date().getTime();
            console.log(`Login yanıtı alındı (${endTime - startTime}ms):`, response.status, response.statusText);
            console.log('Login yanıt başlıkları:', response.headers);
            console.log('Login yanıt verisi:', response.data);

            // Yanıt formatını kontrol et
            return response.data; // Direkt sunucudan gelen yanıtı döndür
        } catch (error: any) {
            console.error('Api login hatası:', error);
            // Hatayı yeniden fırlat
            throw error;
        }
    },

    // Kullanıcı kaydı
    register: async (userData: { name: string; email: string; password: string }) => {
        try {
            // E-postayı küçük harfe çevir
            const normalizedUserData = {
                ...userData,
                email: userData.email ? userData.email.toLowerCase().trim() : ''
            };

            // E-posta adresi kontrolü
            if (!normalizedUserData.email) {
                throw new Error('E-posta adresi gereklidir');
            }

            // Önce API bağlantısını test et
            await api.testConnection();

            console.log('Kayıt isteği gönderiliyor:', `${BASE_URL}/api/auth/register`);
            const response = await apiClient.post('/api/auth/register', normalizedUserData);
            console.log('Kayıt yanıtı alındı:', response.data);
            return response.data;
        } catch (error) {
            console.error('Kayıt hatası:', error);
            throw error;
        }
    },

    // Kullanıcı profil bilgilerini getir
    getUserProfile: async (token: string) => {
        try {
            console.log('Kullanıcı profil bilgileri getiriliyor...');

            // Önce API bağlantısını test et
            await ensureGoodApiConnection();

            const response = await apiClient.get('/api/auth/profile', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                // Cache busting - her zaman güncel veriyi al
                params: {
                    t: new Date().getTime()
                }
            });

            console.log('Profil bilgileri alındı:', response.data);

            // Profil yanıtını işle
            let profileData = response.data;
            if (response.data && response.data.data) {
                profileData = response.data.data;
            }

            // Business ID kontrolü
            if (profileData) {
                try {
                    // 1. Direkt olarak profileData içinde businessId veya business varsa
                    let businessId = profileData.businessId || null;

                    // 2. Eğer business alanı varsa ve string ise, bu bir business ID'dir
                    if (!businessId && profileData.business && typeof profileData.business === 'string') {
                        businessId = profileData.business;
                        console.log('Business ID string olarak profile içinde bulundu:', businessId);
                        profileData.businessId = businessId;
                    }

                    // 3. Eğer business objesi varsa
                    if (!businessId && profileData.business && typeof profileData.business === 'object' && profileData.business._id) {
                        businessId = profileData.business._id;
                        console.log('Business ID business objesi içinde bulundu:', businessId);
                        profileData.businessId = businessId;
                        profileData.businessData = profileData.business;
                    }

                    // İşletme bilgisini alma
                    if (businessId) {
                        console.log(`Business ID bulundu (${businessId}), detay bilgileri getiriliyor...`);
                        try {
                            // Eğer zaten business data varsa, almaya gerek yok
                            if (!profileData.businessData) {
                                const businessResponse = await apiClient.get(`/api/businesses/${businessId}`, {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                    },
                                    timeout: 5000
                                });

                                if (businessResponse.data) {
                                    // Profil verisine işletme bilgilerini ekle
                                    profileData.businessData = businessResponse.data.data || businessResponse.data;
                                    console.log('Business detay bilgileri eklendi', profileData.businessData?.name || 'İsimsiz');
                                }
                            } else {
                                console.log('Business detay bilgileri zaten mevcut:', profileData.businessData?.name || 'İsimsiz');
                            }
                        } catch (businessDetailError) {
                            console.warn('İşletme detay bilgileri alınamadı:', businessDetailError);

                            // My-business endpoint'ini deneyelim
                            try {
                                console.log('My-business endpoint deneniyor...');
                                const myBusinessResponse = await apiClient.get('/api/businesses/my-business', {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                    },
                                    timeout: 5000
                                });

                                if (myBusinessResponse.data && (myBusinessResponse.data._id || (myBusinessResponse.data.data && myBusinessResponse.data.data._id))) {
                                    const businessData = myBusinessResponse.data.data || myBusinessResponse.data;
                                    profileData.businessData = businessData;
                                    // Business ID tutarlılığını sağla
                                    profileData.businessId = businessData._id;
                                    console.log('My-business endpoint ile işletme bilgileri alındı:', businessData.name || 'İsimsiz');
                                }
                            } catch (myBusinessError) {
                                console.warn('My-business endpoint hatası:', myBusinessError);
                            }
                        }
                    }
                    // Business ID yoksa ama BUSINESS_ADMIN rolü varsa
                    else if (profileData.role === 'BUSINESS_ADMIN') {
                        console.warn('BUSINESS_ADMIN rolü var ama business ID bulunamadı, my-business deneniyor...');
                        try {
                            const myBusinessResponse = await apiClient.get('/api/businesses/my-business', {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                timeout: 5000
                            });

                            if (myBusinessResponse.data && (myBusinessResponse.data._id || (myBusinessResponse.data.data && myBusinessResponse.data.data._id))) {
                                const businessData = myBusinessResponse.data.data || myBusinessResponse.data;
                                profileData.businessData = businessData;
                                profileData.businessId = businessData._id;
                                console.log('My-business işletme bilgileri alındı:', businessData.name || 'İsimsiz');
                            }
                        } catch (myBusinessError) {
                            console.warn('My-business endpoint hatası:', myBusinessError);

                            // İşletme listesi üzerinden kontrol edelim
                            try {
                                console.log('İşletme listesinden user email ile eşleşme aranıyor...');
                                const allBusinesses = await api.getBusinesses(token);

                                if (Array.isArray(allBusinesses) && allBusinesses.length > 0) {
                                    // Kullanıcı e-postası ile eşleşen işletmeyi bul
                                    const matchedBusiness = allBusinesses.find(
                                        business => business.email?.toLowerCase() === profileData.email?.toLowerCase()
                                    );

                                    if (matchedBusiness) {
                                        profileData.businessData = matchedBusiness;
                                        profileData.businessId = matchedBusiness._id;
                                        console.log('E-posta ile eşleşen işletme bulundu:', matchedBusiness.name || 'İsimsiz');
                                    } else if (allBusinesses.length > 0) {
                                        // İlk işletmeyi seç (acil çözüm)
                                        profileData.businessData = allBusinesses[0];
                                        profileData.businessId = allBusinesses[0]._id;
                                        console.log('Eşleşme bulunamadı, ilk işletme seçildi:', allBusinesses[0].name || 'İsimsiz');
                                    }
                                }
                            } catch (businessListError) {
                                console.warn('İşletme listesi getirilemedi:', businessListError);
                            }
                        }
                    }
                } catch (businessProcessError) {
                    console.warn('İşletme bilgileri işlenirken hata:', businessProcessError);
                }
            }

            // SUPER_ADMIN için geçici işletme bilgisi
            if (profileData && profileData.role === 'SUPER_ADMIN' && !profileData.businessId) {
                console.log('SUPER_ADMIN için geçici işletme bilgisi oluşturuluyor');
                profileData.businessId = 'super_admin_business';
                profileData.businessData = {
                    _id: 'super_admin_business',
                    name: 'Sistem Yönetimi',
                    isActive: true
                };
            }

            return profileData;
        } catch (error) {
            console.error('Profil getirme hatası:', error);
            console.error('Profil getirme hatası, token geçersiz olabilir:', error);

            // Hata durumunda boş bir profil objesi döndür
            // Bu, uygulamanın çökmesini engeller
            return {
                error: true,
                message: 'Profil bilgileri alınamadı'
            };
        }
    },

    // ------------- ANKET (SURVEY) API FONKSİYONLARI -------------

    // Anketleri (Geri bildirimleri) getir - backend'de /api/surveys endpoint'i kullanılıyor
    getFeedbacks: async (token: string) => {
        try {
            console.log('Anketleri getirme isteği gönderiliyor');

            // API bağlantısını güçlü bir şekilde test et ve iyi bir bağlantı kur
            await ensureGoodApiConnection();

            // Adım 1: Direkt API endpoint'ini dene
            try {
                const response = await apiClient.get('/api/surveys', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    params: {
                        t: new Date().getTime() // cache busting
                    },
                    timeout: 10000 // Timeout arttırıldı
                });

                console.log('Anketler başarıyla alındı:', response.status);

                // API yanıtı kontrolü ve standardizasyonu
                if (response.data) {
                    if (Array.isArray(response.data)) {
                        return response.data;
                    } else if (response.data.data && Array.isArray(response.data.data)) {
                        return response.data.data;
                    } else if (response.data.surveys && Array.isArray(response.data.surveys)) {
                        return response.data.surveys;
                    }
                }
                return [];
            } catch (directError: any) {
                console.warn('Anketleri direkt getirme başarısız:', directError.message);

                // Adım 2: Kullanıcının rolüne göre farklı endpoint'ler deneyelim
                try {
                    // Kullanıcı profilini almaya çalış
                    const userProfile = await api.getUserProfile(token);

                    if (userProfile.role === 'BUSINESS_ADMIN' && userProfile.businessId) {
                        // İşletme yöneticisi için kendi işletmesinin anketlerini getir
                        console.log('İşletme yöneticisi için işletmeye ait anketler getiriliyor...');
                        try {
                            const businessSurveysResponse = await apiClient.get(`/api/businesses/${userProfile.businessId}/surveys`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                timeout: 10000
                            });

                            const surveys = businessSurveysResponse.data.data || businessSurveysResponse.data;
                            console.log(`İşletmeye ait ${Array.isArray(surveys) ? surveys.length : 0} anket bulundu`);
                            return Array.isArray(surveys) ? surveys : [];
                        } catch (businessSurveysError) {
                            console.warn('İşletmeye ait anketleri getirme başarısız:', businessSurveysError);
                        }

                        // Alternatif endpoint denemesi - işletmeye özel anketler
                        try {
                            console.log('Alternatif işletme anketleri endpoint denemesi...');
                            const altBusinessResponse = await apiClient.get(`/api/businesses/${userProfile.businessId}/feedback`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                timeout: 10000
                            });

                            const surveys = altBusinessResponse.data.data || altBusinessResponse.data;
                            return Array.isArray(surveys) ? surveys : [];
                        } catch (altBusinessError) {
                            console.warn('Alternatif işletme anketleri endpoint denemesi başarısız:', altBusinessError);
                        }
                    } else if (userProfile.role === 'SUPER_ADMIN') {
                        // Süper admin için tüm anketleri getirmeyi başka bir endpoint ile dene
                        console.log('Süper admin için tüm anketler getiriliyor...');
                        try {
                            const allSurveysResponse = await apiClient.get('/api/admin/surveys', {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                timeout: 10000
                            });

                            const surveys = allSurveysResponse.data.data || allSurveysResponse.data;
                            console.log(`Toplam ${Array.isArray(surveys) ? surveys.length : 0} anket bulundu`);
                            return Array.isArray(surveys) ? surveys : [];
                        } catch (adminSurveysError) {
                            console.warn('Admin anketlerini getirme başarısız:', adminSurveysError);

                            // SUPER_ADMIN için alternatif endpoint denemesi
                            try {
                                console.log('SUPER_ADMIN için alternatif endpoint deneniyor...');
                                const altAdminResponse = await apiClient.get('/api/admin/feedback', {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                    },
                                    timeout: 10000
                                });

                                const surveys = altAdminResponse.data.data || altAdminResponse.data;
                                return Array.isArray(surveys) ? surveys : [];
                            } catch (altAdminError) {
                                console.warn('SUPER_ADMIN alternatif endpoint denemesi başarısız:', altAdminError);
                            }
                        }
                    }
                } catch (profileError) {
                    console.warn('Kullanıcı profilini getirme başarısız:', profileError);
                }

                // Eğer 404 hatası ise, muhtemelen endpoint yanlış - diğer olası endpoint'leri dene
                if (directError.response?.status === 404) {
                    console.warn('Anket API endpoint\'i bulunamadı. Alternatif endpoint deneniyor...');
                    // Tüm alternatif endpoint'leri bir dizi içinde topla ve sırayla dene
                    const alternativeEndpoints = [
                        '/api/feedback',
                        '/api/feedbacks',
                        '/api/forms',
                        '/api/survey'
                    ];

                    for (const endpoint of alternativeEndpoints) {
                        try {
                            console.log(`Alternatif endpoint deneniyor: ${endpoint}`);
                            const alternativeResponse = await apiClient.get(endpoint, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                timeout: 5000 // Daha kısa timeout
                            });

                            if (alternativeResponse.data) {
                                const surveys = alternativeResponse.data.data ||
                                    alternativeResponse.data.surveys ||
                                    alternativeResponse.data;

                                if (Array.isArray(surveys)) {
                                    console.log(`✅ Alternatif endpoint çalıştı: ${endpoint}, ${surveys.length} anket bulundu`);
                                    return surveys;
                                }
                            }
                        } catch (altError: any) {
                            console.warn(`Alternatif endpoint (${endpoint}) başarısız:`, altError.message);
                        }
                    }
                }

                // Hiçbir endpoint çalışmadıysa tekrar API bağlantısını kontrol et ve güncelle
                console.log('Hiçbir endpoint çalışmadı, API bağlantısını yeniden kontrol ediyorum...');
                const newConnection = await tryConnectToIP();
                if (newConnection) {
                    // Yeni bağlantı ile tekrar dene
                    console.log(`Yeni API bağlantısı (${newConnection}) ile tekrar deneniyor...`);
                    try {
                        const retryResponse = await axios.get(`${newConnection}/api/surveys`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                            timeout: 10000
                        });

                        if (retryResponse.data) {
                            const surveys = retryResponse.data.data ||
                                retryResponse.data.surveys ||
                                retryResponse.data;

                            if (Array.isArray(surveys)) {
                                console.log(`✅ Yeni bağlantı ile anketler alındı: ${surveys.length} anket`);
                                return surveys;
                            }
                        }
                    } catch (retryError) {
                        console.warn('Yeni bağlantı ile tekrar deneme başarısız:', retryError);
                    }
                }

                // Son çare: Boş dizi dön
                console.warn('⚠️ Tüm denemeler başarısız oldu. Boş anket listesi döndürülüyor.');
                return [];
            }
        } catch (error) {
            console.error('Anket getirme hatası:', error);
            // Hata durumunda tüm yöntemler denendi ve başarısız oldu
            console.warn('Hata nedeniyle boş anket listesi döndürülüyor');
            return [];
        }
    },

    // Tekil anket (Geri bildirim) getir
    getFeedback: async (token: string, id: string) => {
        try {
            const response = await apiClient.get(`/api/surveys/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            // API yanıtı kontrolü ve standardizasyonu
            if (response.data) {
                if (response.data.data) {
                    return response.data.data;
                } else {
                    return response.data;
                }
            }

            return null;
        } catch (error) {
            console.error('Anket detayı getirme hatası:', error);
            return null;
        }
    },

    // Yeni anket (Geri bildirim) oluştur
    createFeedback: async (token: string, feedbackData: {
        title: string;
        description: string;
        questions: any[];
        startDate?: Date;
        endDate?: Date;
        businessId?: string; // businessId özelliği ekledik
    }) => {
        try {
            console.log('Anket oluşturma isteği gönderiliyor...');
            console.log('Gönderilecek anket verileri:', JSON.stringify(feedbackData, null, 2));

            // API bağlantı kontrolü
            await ensureGoodApiConnection();

            // Önce işletme ID'sini bulmak için API çağrısı yap
            let businessId = feedbackData.businessId || null; // Eğer feedbackData içinde zaten varsa kullan

            // İşletme ID'si zaten parametreden gelmediyse, bulalım
            if (!businessId) {
                try {
                    // 1. Kullanıcı profilini al
                    const userProfile = await api.getUserProfile(token);
                    console.log('Kullanıcı profili:', userProfile);

                    // 2. İşletme ID'si direkt kullanıcı profilinde olabilir
                    if (userProfile && userProfile.businessId) {
                        businessId = userProfile.businessId;
                        console.log(`İşletme ID'si kullanıcı profilinden alındı: ${businessId}`);
                    }
                    // 3. Business objesi varsa ve string ise
                    else if (userProfile && userProfile.business && typeof userProfile.business === 'string') {
                        businessId = userProfile.business;
                        console.log(`İşletme ID'si kullanıcı profilindeki business alanından alındı: ${businessId}`);
                    }
                    // 4. Business objesi varsa ve obje ise
                    else if (userProfile && userProfile.business && typeof userProfile.business === 'object' && userProfile.business._id) {
                        businessId = userProfile.business._id;
                        console.log(`İşletme ID'si business objesinden alındı: ${businessId}`);
                    }
                    // 5. BusinessData objesi varsa
                    else if (userProfile && userProfile.businessData && userProfile.businessData._id) {
                        businessId = userProfile.businessData._id;
                        console.log(`İşletme ID'si businessData objesinden alındı: ${businessId}`);
                    }
                    // 6. Kullanıcı işletme yöneticisi ise işletme bilgilerini al
                    else if (userProfile && userProfile.role === 'BUSINESS_ADMIN') {
                        try {
                            // Kullanıcının işletme bilgilerini al
                            console.log('İşletme bilgileri alınıyor...');
                            const businessResponse = await apiClient.get('/api/businesses/my-business', {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                timeout: 10000,
                                validateStatus: () => true // Herhangi bir status code'u kabul et
                            });

                            if (businessResponse.data && businessResponse.data._id) {
                                businessId = businessResponse.data._id;
                                console.log(`İşletme ID'si işletme bilgilerinden alındı: ${businessId}`);
                            } else if (businessResponse.data && businessResponse.data.data && businessResponse.data.data._id) {
                                businessId = businessResponse.data.data._id;
                                console.log(`İşletme ID'si işletme data objesinden alındı: ${businessId}`);
                            }
                        } catch (businessError) {
                            console.warn('İşletme bilgileri alınamadı:', businessError);
                        }
                    }

                    // 7. Alternatif olarak işletme listesinden arama yap
                    if (!businessId) {
                        try {
                            console.log('İşletme listesinden uygun işletme aranıyor...');
                            const businessesResponse = await apiClient.get('/api/businesses', {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                timeout: 7000,
                                validateStatus: () => true
                            });

                            // Yanıt formatına göre işlem
                            let businesses = [];
                            if (businessesResponse.data && Array.isArray(businessesResponse.data)) {
                                businesses = businessesResponse.data;
                            } else if (businessesResponse.data && businessesResponse.data.data && Array.isArray(businessesResponse.data.data)) {
                                businesses = businessesResponse.data.data;
                            }

                            if (Array.isArray(businesses) && businesses.length > 0) {
                                // Kullanıcının e-posta adresine göre eşleştirme (BUSINESS_ADMIN için)
                                if (userProfile && userProfile.email) {
                                    const matchedBusiness = businesses.find(
                                        business => business.email && business.email.toLowerCase() === userProfile.email.toLowerCase()
                                    );

                                    if (matchedBusiness) {
                                        businessId = matchedBusiness._id;
                                        console.log(`İşletme ID e-posta eşleşmesine göre bulundu: ${businessId}`);
                                    } else {
                                        // Eşleşme yoksa ilk işletmeyi kullan
                                        businessId = businesses[0]._id;
                                        console.log(`Eşleşme bulunamadı, ilk işletme seçildi: ${businessId}`);
                                    }
                                } else {
                                    // Kullanıcı e-postası yoksa ilk işletmeyi kullan
                                    businessId = businesses[0]._id;
                                    console.log(`İşletme ID'si işletme listesinden alındı (ilk işletme): ${businessId}`);
                                }
                            }
                        } catch (businessListError) {
                            console.warn('İşletme listesi alınamadı:', businessListError);
                        }
                    }

                    // 8. SUPER_ADMIN için geçici işletme ID'si
                    if (!businessId && userProfile && userProfile.role === 'SUPER_ADMIN') {
                        businessId = 'super_admin_business_' + new Date().getTime();
                        console.log(`SUPER_ADMIN için geçici işletme ID oluşturuldu: ${businessId}`);
                    }

                    // 9. Hiçbir yöntem işe yaramadıysa rastgele bir ID oluştur (son çare)
                    if (!businessId) {
                        businessId = `temp_business_${new Date().getTime()}`;
                        console.log(`Geçici işletme ID oluşturuldu: ${businessId}`);
                    }
                } catch (profileError) {
                    console.warn('Kullanıcı profili alınamadı:', profileError);
                    // Son çare
                    businessId = `emergency_business_${new Date().getTime()}`;
                    console.warn(`ACİL DURUM: Profile bilgisi alınamadı. Acil durum işletme ID'si oluşturuldu: ${businessId}`);
                }
            }

            // İşletme ID'si bilgisinde son kontrol
            if (!businessId) {
                console.error('❌ İşletme ID\'si bulunamadı ve bu zorunlu bir alan!');
                throw new Error('İşletme bilgisi eksik. Lütfen bir işletme seçin veya işletme bilgilerinizi güncelleyin.');
            }

            // Web uygulamasıyla uyumlu formata dönüştür
            const formattedData = {
                title: feedbackData.title,
                description: feedbackData.description,
                questions: feedbackData.questions.map(q => ({
                    text: q.text,
                    type: q.type,
                    required: q.required,
                    options: q.options || []
                })),
                isActive: true, // Varsayılan olarak aktif
                startDate: feedbackData.startDate || new Date(),
                endDate: feedbackData.endDate || new Date(new Date().setMonth(new Date().getMonth() + 1)), // Varsayılan bitiş 1 ay sonra
                businessId: businessId // İşletme ID'sini ekle
            };

            console.log('Formatlanmış anket verileri:', JSON.stringify(formattedData, null, 2));

            // API isteği gönder
            const response = await apiClient.post('/api/surveys', formattedData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            console.log('Anket oluşturma yanıtı:', response.status, response.statusText);
            console.log('Anket oluşturma yanıt detayı:', response.data);

            // API yanıtı kontrolü ve standardizasyonu
            if (response.data) {
                if (response.data.data) {
                    return response.data.data;
                } else if (response.data._id) {
                    return response.data;
                }
            }

            return null;
        } catch (error: any) {
            console.error('Anket oluşturma hatası:', error);

            // Hata yanıtı detaylarını log
            if (axios.isAxiosError(error) && error.response) {
                console.error('Sunucu yanıt kodu:', error.response.status);
                console.error('Sunucu hata mesajı:', error.response.data);

                // 403 hatası (Yetkisiz) durumunda alternatif endpoint dene
                if (error.response.status === 403) {
                    try {
                        console.log('403 hatası için alternatif endpoint deneniyor...');
                        const altResponse = await apiClient.post('/api/admin/surveys', feedbackData, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 10000
                        });

                        console.log('Alternatif endpoint başarılı:', altResponse.status);
                        return altResponse.data.data || altResponse.data;
                    } catch (altError) {
                        console.warn('Alternatif endpoint denemesi başarısız:', altError);
                    }
                }
            }

            // API hata mesajını al
            let errorMessage = 'Anket oluşturulurken bir hata oluştu';
            if (axios.isAxiosError(error) && error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (axios.isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            throw new Error(errorMessage);
        }
    },

    // Anket (Geri bildirim) güncelle
    updateFeedback: async (token: string, id: string, feedbackData: { title?: string; description?: string; questions?: any[]; isActive?: boolean }) => {
        try {
            const response = await apiClient.put(`/api/surveys/${id}`, feedbackData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            // API yanıtı kontrolü ve standardizasyonu
            if (response.data) {
                if (response.data.data) {
                    return response.data.data;
                } else {
                    return response.data;
                }
            }

            return null;
        } catch (error) {
            console.error('Anket güncelleme hatası:', error);
            throw error;
        }
    },

    // Anket (Geri bildirim) sil
    deleteFeedback: async (token: string, id: string) => {
        try {
            const response = await apiClient.delete(`/api/surveys/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return response.data;
        } catch (error) {
            console.error('Anket silme hatası:', error);
            throw error;
        }
    },

    // ------------- İŞLETME (BUSINESS) API FONKSİYONLARI -------------

    // Tüm işletmeleri getir
    getBusinesses: async (token: string) => {
        try {
            console.log('İşletmeleri getirme isteği gönderiliyor');

            // Önce API bağlantısını kontrol et
            await ensureGoodApiConnection();

            // API isteği ve başarı süresi ölçümü
            const startTime = new Date().getTime();

            try {
                const response = await apiClient.get('/api/businesses', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    // Önbellek kontrolünü devre dışı bırakarak her zaman güncel verileri alıyoruz
                    params: {
                        _: new Date().getTime() // Cache busting için zaman damgası ekliyoruz
                    }
                });

                const endTime = new Date().getTime();
                console.log(`İşletmeler alındı (İstek süresi: ${endTime - startTime}ms)`);

                if (response.data && Array.isArray(response.data)) {
                    console.log(`İşletmeler listesi okundu: ${response.data.length} adet işletme`);

                    // Veri validasyonu
                    for (let i = 0; i < response.data.length; i++) {
                        if (!response.data[i]._id) {
                            console.warn(`UYARI: ${i}. sıradaki işletme ID'si yok!`);
                        }
                    }

                    return response.data;
                } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                    console.log(`İşletmeler listesi okundu: ${response.data.data.length} adet işletme (data alanından)`);
                    return response.data.data;
                } else {
                    console.warn('UYARI: API yanıtı dizi formatında değil:', response.data);
                    // API yanıt formatı beklenmedik durumda bile bir dizi dönmesi için:
                    return Array.isArray(response.data) ? response.data :
                        (response.data?.data && Array.isArray(response.data.data)) ? response.data.data : [];
                }
            } catch (directError: any) {
                console.warn('İşletme listesi isteği başarısız:', directError.message);

                // Yetki hatası (403) veya kaynak bulunamadı (404) hatası veya sunucu hatası (500) durumunda
                if (directError.response?.status === 403 || directError.response?.status === 404 || directError.response?.status === 500) {
                    console.log('Hata durumu için alternatif çözüm uygulanıyor...');

                    // Alternatif endpoint denemeleri - 403, 404 veya 500 hatası alındığında
                    try {
                        console.log("Alternatif işletme endpointi deneniyor: /api/admin/businesses");
                        const altResponse = await apiClient.get('/api/admin/businesses', {
                            headers: { Authorization: `Bearer ${token}` },
                            params: { _: new Date().getTime() }
                        });

                        if (altResponse.data) {
                            const businesses = Array.isArray(altResponse.data) ? altResponse.data :
                                (altResponse.data.data && Array.isArray(altResponse.data.data)) ? altResponse.data.data : [];
                            console.log(`Alternatif endpoint ile ${businesses.length} işletme alındı`);
                            return businesses;
                        }
                    } catch (altError) {
                        console.warn('Alternatif endpoint denemesi başarısız:', altError);
                    }

                    // Yeni bağlantı denemesi
                    try {
                        console.log('Farklı API URL ile tekrar deneniyor...');
                        const newConnection = await tryConnectToIP();
                        if (newConnection) {
                            const retryResponse = await axios.get(`${newConnection}/api/businesses`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                timeout: 8000
                            });

                            if (retryResponse.data) {
                                const businesses = retryResponse.data.data || retryResponse.data;
                                if (Array.isArray(businesses)) {
                                    console.log(`Yeni API URL ile ${businesses.length} işletme alındı`);
                                    return businesses;
                                }
                            }
                        }
                    } catch (retryError) {
                        console.warn('Farklı API URL ile tekrar deneme başarısız:', retryError);
                    }
                }

                throw directError;
            }
        } catch (error) {
            console.error('İşletme getirme hatası:', error);
            // Hata durumunda boş dizi döndür
            console.warn('⚠️ Tüm denemeler başarısız oldu. Boş işletme listesi döndürülüyor.');
            return [];
        }
    },

    // İşletme bilgilerini getir
    getBusiness: async (token: string, id: string) => {
        try {
            console.log(`İşletme detayı (ID: ${id}) getirme isteği gönderiliyor...`);

            // İlk önce direkt olarak işletme ID'si ile deneyelim
            try {
                const response = await apiClient.get(`/api/businesses/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    timeout: 8000 // 8 saniye timeout
                });
                console.log('İşletme bilgileri başarıyla alındı:', response.status);
                return response.data.data || response.data;
            } catch (directError: any) {
                console.warn(`İşletme detayını (ID: ${id}) doğrudan getirme başarısız:`, directError.message);

                // Alternatif olarak tüm işletmeleri getirip filtrelemeyi deneyelim
                try {
                    console.log('Alternatif yöntem: Tüm işletmeleri getirip filtreleme yapılıyor...');
                    const allBusinessesResponse = await apiClient.get('/api/businesses', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        timeout: 8000
                    });

                    const businesses = allBusinessesResponse.data.data || allBusinessesResponse.data;
                    if (Array.isArray(businesses)) {
                        const foundBusiness = businesses.find(b => b._id === id);
                        if (foundBusiness) {
                            console.log('İşletme alternatif yöntemle bulundu');
                            return foundBusiness;
                        }
                    }
                    throw new Error('İşletme bulunamadı');
                } catch (alternativeError) {
                    console.warn('Alternatif yöntem de başarısız:', alternativeError);
                    throw directError; // İlk hatayı geri fırlat
                }
            }
        } catch (error: any) {
            console.error('İşletme detayı getirme hatası:', error.message);
            // Uygulamanın çalışmaya devam edebilmesi için boş işletme nesnesi dön
            return {
                _id: id,
                name: 'Bilinmeyen İşletme',
                error: true,
                errorMessage: error.message,
                isActive: true
            };
        }
    },

    // Yeni işletme oluştur
    createBusiness: async (token: string, businessData: {
        name: string;
        address: string;
        phone: string;
        email: string;
        description?: string;
        password: string;
        isActive?: boolean
    }) => {
        try {
            console.log('İşletme oluşturma isteği gönderiliyor:', {
                ...businessData,
                password: '***' // Şifreyi gizle
            });

            const response = await apiClient.post('/api/businesses', businessData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });
            console.log('İşletme oluşturma yanıtı:', response.data);
            return response.data.data || response.data;
        } catch (error: any) {
            console.error('İşletme oluşturma hatası detayları:', error.response?.data);
            if (axios.isAxiosError(error) && error.response) {
                // Axios hata nesnesini zenginleştir
                error.message = error.response.data?.message || error.message;
            }
            throw error;
        }
    },

    // İşletme bilgilerini güncelle
    updateBusiness: async (token: string, id: string, businessData: {
        name?: string;
        address?: string;
        phone?: string;
        email?: string;
        isActive?: boolean
    }) => {
        try {
            const response = await apiClient.put(`/api/businesses/${id}`, businessData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('İşletme güncelleme hatası:', error);
            throw error;
        }
    },

    // İşletme sil
    deleteBusiness: async (token: string, id: string) => {
        try {
            console.log(`İşletme silme isteği gönderiliyor - İşletme ID: ${id}`);
            console.log('API URL:', `${BASE_URL}/api/businesses/${id}`);
            console.log('Token (ilk 15 karakter):', token ? token.substring(0, 15) + '...' : 'Yok');

            // İsteğin ne gönderdiğini kontrol et
            console.log('DELETE isteği gönderiliyor...');

            const response = await apiClient.delete(`/api/businesses/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log('İşletme silme yanıtı:', response.status, response.statusText);
            console.log('İşletme silme yanıt detayı:', response.data);

            // Veritabanındaki silme işlemini doğrula
            setTimeout(async () => {
                try {
                    console.log('İşletmenin silindiğini doğrulama kontrolü yapılıyor...');
                    // Silinen işletmeyi getirmeye çalış - 404 hatası bekliyoruz
                    await apiClient.get(`/api/businesses/${id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    console.warn('⚠️ UYARI: İşletme hala mevcut gibi görünüyor! Backend sorunu olabilir.');
                } catch (verifyError: any) {
                    if (verifyError.response && verifyError.response.status === 404) {
                        console.log('✅ İşletme başarıyla silindiği doğrulandı (404 hatası alındı)');
                    } else {
                        console.warn('⚠️ Doğrulama sırasında beklenmeyen hata:', verifyError.message);
                    }
                }
            }, 1000);

            return response.data;
        } catch (error) {
            console.error('İşletme silme hatası:', error);
            throw error;
        }
    },

    // İşletme onay isteği gönder
    requestBusinessApproval: async (token: string, businessId: string) => {
        try {
            const response = await apiClient.post(`/api/businesses/${businessId}/request-approval`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('İşletme onay isteği gönderme hatası:', error);
            throw error;
        }
    },

    // İşletme onay isteklerini getir (SUPER_ADMIN için)
    getBusinessApprovalRequests: async (token: string) => {
        try {
            const response = await apiClient.get('/api/business-approvals', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('İşletme onay istekleri getirme hatası:', error);
            // Eğer 403 veya 404 gelirse, boş dizi döndür
            if (axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404)) {
                return [];
            }
            throw error;
        }
    },

    // İşletme onay isteğini onayla
    approveBusinessRequest: async (token: string, requestId: string) => {
        try {
            const response = await apiClient.post(`/api/business-approvals/${requestId}/approve`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('İşletme onay isteği onaylama hatası:', error);
            throw error;
        }
    },

    // İşletme onay isteğini reddet
    rejectBusinessRequest: async (token: string, requestId: string, rejectionReason: string) => {
        try {
            const response = await apiClient.post(`/api/business-approvals/${requestId}/reject`, {
                rejectionReason
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('İşletme onay isteği reddetme hatası:', error);
            throw error;
        }
    },

    // İşletme istatistiklerini getir
    getBusinessStats: async (token: string, businessId: string) => {
        try {
            const response = await apiClient.get(`/api/businesses/${businessId}/stats`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('İşletme istatistikleri getirme hatası:', error);
            // 403 veya 404 hatası alırsak boş istatistik döndür
            if (axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404)) {
                return {
                    totalSurveys: 0,
                    activeSurveys: 0,
                    totalResponses: 0,
                    responseRate: 0,
                    averageRating: 0
                };
            }
            throw error;
        }
    },

    // İşletmeye kullanıcı ata (BUSINESS_ADMIN veya CUSTOMER)
    assignUserToBusiness: async (token: string, businessId: string, userId: string, role: string) => {
        try {
            const response = await apiClient.post(`/api/businesses/${businessId}/assign-user`, {
                userId,
                role
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('Kullanıcı işletmeye atama hatası:', error);
            throw error;
        }
    },

    // İşletmeye ait kullanıcıları getir
    getBusinessUsers: async (token: string, businessId: string) => {
        try {
            console.log(`İşletme (ID: ${businessId}) kullanıcıları getirme isteği gönderiliyor...`);

            // API bağlantısının iyi durumda olduğunu kontrol et
            await ensureGoodApiConnection();

            try {
                // İlk olarak direkt API endpoint'ini deneyelim
                const response = await apiClient.get(`/api/businesses/${businessId}/users`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    timeout: 10000
                });
                console.log('İşletme kullanıcıları başarıyla alındı');
                return response.data.data || response.data;
            } catch (directError: any) {
                console.warn(`İşletme kullanıcılarını doğrudan getirme başarısız:`, directError.message);

                // Alternatif olarak tüm kullanıcıları getirip filtrelemeyi deneyelim
                if (directError.response?.status === 403 || directError.response?.status === 404 || directError.response?.status === 500) {
                    console.log('Alternatif yöntem: Tüm kullanıcıları getirip işletmeye göre filtreleme yapılıyor...');
                    try {
                        const allUsersResponse = await apiClient.get('/api/users', {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                            timeout: 10000
                        });

                        const users = allUsersResponse.data.data || allUsersResponse.data;
                        if (Array.isArray(users)) {
                            // İşletmeye ait kullanıcıları filtrele
                            const businessUsers = users.filter(user =>
                                user.businessId === businessId ||
                                (user.business && user.business._id === businessId)
                            );
                            console.log(`İşletmeye ait ${businessUsers.length} kullanıcı bulundu`);
                            return businessUsers;
                        }
                    } catch (alternativeError) {
                        console.warn('Alternatif yöntem de başarısız:', alternativeError);
                    }

                    // Alternatif endpoint denemesi
                    try {
                        console.log('Alternatif endpoint deneniyor: /api/admin/businesses/users');
                        const altResponse = await apiClient.get(`/api/admin/businesses/${businessId}/users`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                            timeout: 8000
                        });

                        const users = altResponse.data.data || altResponse.data;
                        if (Array.isArray(users)) {
                            console.log(`Alternatif endpoint ile ${users.length} kullanıcı bulundu`);
                            return users;
                        }
                    } catch (altEndpointError) {
                        console.warn('Alternatif endpoint denemesi başarısız:', altEndpointError);
                    }

                    // Farklı bir API URL ile tekrar dene
                    try {
                        console.log('Farklı API URL ile tekrar deneniyor...');
                        const newConnection = await tryConnectToIP();
                        if (newConnection) {
                            const retryResponse = await axios.get(`${newConnection}/api/businesses/${businessId}/users`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                timeout: 8000
                            });

                            const users = retryResponse.data.data || retryResponse.data;
                            if (Array.isArray(users)) {
                                console.log(`Yeni API URL ile ${users.length} kullanıcı bulundu`);
                                return users;
                            }
                        }
                    } catch (retryError) {
                        console.warn('Farklı API URL ile tekrar deneme başarısız:', retryError);
                    }
                }

                // Eğer hata 403 (Forbidden) ise, muhtemelen yetki sorunu var
                if (directError.response?.status === 403) {
                    console.warn('Kullanıcıları getirmek için yetki yok');
                    return []; // Boş dizi döndür
                }

                // Hiçbir yöntem çalışmadıysa boş dizi döndür
                console.warn('⚠️ Hiçbir yöntem çalışmadı, boş kullanıcı listesi döndürülüyor');
                return [];
            }
        } catch (error) {
            console.error('İşletme kullanıcıları getirme hatası:', error);
            return []; // Hata durumunda boş dizi dön
        }
    },

    // İşletmeye özel gösterge paneli istatistiklerini getir
    getBusinessDashboardStats: async (token: string, businessId: string) => {
        try {
            console.log('İşletme gösterge paneli istatistiklerini getirme isteği gönderiliyor');

            // Tüm anketleri getir
            const surveys = await api.getFeedbacks(token).catch(() => []);

            // İşletmeye ait anketleri filtrele (businessId'ye göre)
            const businessSurveys = Array.isArray(surveys)
                ? surveys.filter(s => s.businessId === businessId)
                : [];

            // İstatistikleri hesapla - sadece gerçek verilerden
            const stats = {
                totalSurveys: businessSurveys.length,
                activeSurveys: businessSurveys.filter(s => s.isActive).length,
                totalResponses: businessSurveys.reduce((total, survey) =>
                    total + (Array.isArray(survey.responses) ? survey.responses.length : 0), 0),
                averageRating: calculateAverageRating(businessSurveys),
                responseRate: calculateResponseRate(businessSurveys)
            };

            console.log('İşletme gösterge paneli istatistikleri hesaplandı:', stats);
            return stats;
        } catch (error) {
            console.error('İşletme gösterge paneli istatistikleri hesaplama hatası:', error);
            throw error;
        }
    },

    // ------------- KULLANICI (USER) API FONKSİYONLARI -------------

    // Tüm kullanıcıları getir
    getUsers: async (token: string) => {
        try {
            console.log('Kullanıcıları getirme isteği gönderiliyor');

            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            // Önce kullanıcı profil bilgisini almayı deneyelim
            let userRole = '';
            try {
                const userProfile = await api.getUserProfile(token);
                userRole = userProfile.role || '';
                console.log(`Kullanıcı rolü: ${userRole}`);
            } catch (profileError) {
                console.warn('Kullanıcı profili getirilemedi:', profileError);
            }

            // İşletme yöneticileri için kendi işletmelerine ait kullanıcıları getir
            if (userRole === 'BUSINESS_ADMIN') {
                console.log('İşletme yöneticisi için kullanıcılar getiriliyor...');
                try {
                    // Önce işletme bilgilerini almaya çalışalım
                    const response = await apiClient.get('/api/businesses/my-business', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        timeout: 10000
                    });

                    const businessId = response.data?._id;
                    if (businessId) {
                        console.log(`İşletme ID bulundu: ${businessId}, işletmeye ait kullanıcılar getiriliyor...`);
                        const usersResponse = await apiClient.get(`/api/businesses/${businessId}/users`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                            timeout: 10000
                        });
                        console.log('İşletme kullanıcıları alındı:', usersResponse.data);
                        return usersResponse.data.data || usersResponse.data;
                    }
                } catch (businessError) {
                    console.warn('İşletme bilgileri alınamadı, genel users API kullanılacak:', businessError);
                }
            }

            // Alternatif denemeler
            try {
                // Standart kullanıcı endpoint'i - sadece SUPER_ADMIN erişebilir
                const response = await apiClient.get('/api/users', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    timeout: 10000
                });
                console.log('Kullanıcılar alındı:', response.data);
                return response.data.data || response.data;
            } catch (error: any) {
                console.warn('Standart users API başarısız:', error.message);

                // Alternatif endpoint denemeleri
                try {
                    console.log('Alternatif endpoint deneniyor: /api/admin/users');
                    const altResponse = await apiClient.get('/api/admin/users', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        timeout: 8000
                    });

                    const users = altResponse.data.data || altResponse.data;
                    if (Array.isArray(users)) {
                        console.log(`Alternatif endpoint ile ${users.length} kullanıcı bulundu`);
                        return users;
                    }
                } catch (altError) {
                    console.warn('Alternatif endpoint denemesi başarısız:', altError);
                }

                // Farklı API URL denemesi
                try {
                    console.log('Farklı API URL ile tekrar deneniyor...');
                    const newConnection = await tryConnectToIP();
                    if (newConnection) {
                        const retryResponse = await axios.get(`${newConnection}/api/users`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                            timeout: 8000
                        });

                        const users = retryResponse.data.data || retryResponse.data;
                        if (Array.isArray(users)) {
                            console.log(`Yeni API URL ile ${users.length} kullanıcı bulundu`);
                            return users;
                        }
                    }
                } catch (retryError) {
                    console.warn('Farklı API URL ile tekrar deneme başarısız:', retryError);
                }

                // Hiçbir yöntem çalışmadıysa
                console.warn('⚠️ Hiçbir yöntem çalışmadı, boş kullanıcı listesi döndürülüyor');
                return [];
            }
        } catch (error) {
            console.error('Kullanıcı getirme hatası:', error);
            // Hata durumunda boş dizi dön
            console.warn('Hata nedeniyle boş kullanıcı listesi döndürülüyor');
            return [];
        }
    },

    // Tekil kullanıcı detayı getir
    getUser: async (token: string, id: string) => {
        try {
            const response = await apiClient.get(`/api/users/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                timeout: 10000
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('Kullanıcı detayı getirme hatası:', error);
            throw error;
        }
    },

    // Yeni kullanıcı oluştur
    createUser: async (token: string, userData: {
        name: string;
        email: string;
        password: string;
        role: string;
        businessId?: string;
    }) => {
        try {
            const normalizedUserData = {
                ...userData,
                email: userData.email.toLowerCase().trim()
            };

            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            const response = await apiClient.post('/api/users', normalizedUserData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('Kullanıcı oluşturma hatası:', error);
            throw error;
        }
    },

    // Kullanıcı bilgilerini güncelle
    updateUser: async (token: string, id: string, userData: {
        name?: string;
        email?: string;
        password?: string;
        role?: string;
        businessId?: string;
        isActive?: boolean;
    }) => {
        try {
            const normalizedUserData = {
                ...userData,
                ...(userData.email ? { email: userData.email.toLowerCase().trim() } : {})
            };

            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            const response = await apiClient.put(`/api/users/${id}`, normalizedUserData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('Kullanıcı güncelleme hatası:', error);
            throw error;
        }
    },

    // Kullanıcı sil
    deleteUser: async (token: string, id: string) => {
        try {
            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            const response = await apiClient.delete(`/api/users/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            console.error('Kullanıcı silme hatası:', error);
            throw error;
        }
    },

    // ------------- GÖSTERGE PANELİ (DASHBOARD) API FONKSİYONLARI -------------

    // Gösterge paneli istatistiklerini getir - Gerçek verilerden hesaplar
    getDashboardStats: async (token: string) => {
        try {
            console.log('Gösterge paneli istatistiklerini hesaplama için veriler alınıyor...');

            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            // Önce kullanıcı profil bilgisini almayı deneyelim
            let userRole = '';
            let userId = '';
            try {
                const userProfile = await api.getUserProfile(token);
                userRole = userProfile.role || '';
                userId = userProfile._id || '';
                console.log(`Kullanıcı rolü: ${userRole}, ID: ${userId}`);
            } catch (profileError) {
                console.warn('Kullanıcı profili getirilemedi:', profileError);
            }

            // İşletme yöneticisi için kendi işletmesinin istatistiklerini getir
            if (userRole === 'BUSINESS_ADMIN') {
                console.log('İşletme yöneticisi için işletme istatistikleri getiriliyor...');
                try {
                    // Önce işletme bilgilerini almaya çalışalım
                    const response = await apiClient.get('/api/businesses/my-business', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        timeout: 10000
                    });

                    const businessId = response.data?._id;
                    if (businessId) {
                        console.log(`İşletme ID bulundu: ${businessId}, işletme istatistikleri getiriliyor...`);
                        try {
                            const statsResponse = await apiClient.get(`/api/businesses/${businessId}/stats`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                params: {
                                    _: new Date().getTime() // Cache busting
                                },
                                timeout: 10000
                            });
                            console.log('İşletme istatistikleri alındı:', statsResponse.data);
                            return statsResponse.data.data || statsResponse.data;
                        } catch (statsError) {
                            console.warn('İşletme istatistikleri API hatası:', statsError);

                            // Manuel hesaplama dene
                            console.log('İşletmeye ait anketler getiriliyor...');
                            const surveysResponse = await apiClient.get(`/api/businesses/${businessId}/surveys`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                timeout: 10000
                            });

                            const surveys = surveysResponse.data.data || surveysResponse.data || [];

                            // İstatistikleri hesapla
                            const stats = {
                                totalSurveys: Array.isArray(surveys) ? surveys.length : 0,
                                activeSurveys: Array.isArray(surveys) ? surveys.filter(s => s.isActive).length : 0,
                                totalResponses: Array.isArray(surveys) ? surveys.reduce((total, survey) =>
                                    total + (Array.isArray(survey.responses) ? survey.responses.length : 0), 0) : 0,
                                averageRating: calculateAverageRating(surveys),
                                responseRate: calculateResponseRate(surveys)
                            };

                            console.log('Manuel hesaplanan işletme istatistikleri:', stats);
                            return stats;
                        }
                    }
                } catch (businessError) {
                    console.warn('İşletme bilgileri alınamadı:', businessError);
                }
            }

            // API'den doğrudan gösterge paneli istatistiklerini almayı deneyelim (SUPER_ADMIN için)
            try {
                console.log('Backend\'den direkt istatistikleri alınıyor...');
                const response = await apiClient.get('/api/dashboard/stats', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    // Her zaman güncel veri almak için cache busting
                    params: {
                        _: new Date().getTime()
                    },
                    timeout: 10000
                });

                console.log('Backend\'den alınan gösterge paneli istatistikleri:', response.data);
                if (response.data && typeof response.data === 'object') {
                    return response.data.data || response.data;
                }
            } catch (apiError) {
                console.warn('Backend\'den istatistikler alınamadı, manuel hesaplama yapılacak:', apiError);

                // Alternatif endpoint denemesi
                try {
                    console.log('Alternatif endpoint deneniyor: /api/admin/dashboard');
                    const altResponse = await apiClient.get('/api/admin/dashboard', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        params: { _: new Date().getTime() },
                        timeout: 8000
                    });

                    if (altResponse.data) {
                        console.log('Alternatif endpoint ile istatistikler alındı');
                        return altResponse.data.data || altResponse.data;
                    }
                } catch (altError) {
                    console.warn('Alternatif endpoint denemesi başarısız:', altError);
                }
            }

            // Backend'den alamazsak, manuel olarak hesaplayalım
            // Anketleri getir (bu fonksiyon genellikle çalışıyor)
            let surveys = [];
            try {
                surveys = await api.getFeedbacks(token);
            } catch (error) {
                console.warn('Anket verisi alınamadı, boş dizi kullanılıyor');
                surveys = [];
            }

            // Kullanıcıları ve işletmeleri getirmeyi dene
            let users = [];
            let businesses = [];

            try {
                users = await api.getUsers(token);
            } catch (error) {
                console.warn('Kullanıcı verisi alınamadı, boş dizi kullanılıyor');
                users = [];
            }

            try {
                // Cache busting ile işletmeleri getir
                businesses = await apiClient.get('/api/businesses', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    params: {
                        _: new Date().getTime() // Cache busting
                    },
                    timeout: 8000
                }).then(res => res.data.data || res.data || []);
            } catch (error) {
                console.warn('İşletme verisi alınamadı, boş dizi kullanılıyor');
                businesses = [];
            }

            // İstatistikleri hesapla - sadece gerçek verilerden
            const stats = {
                totalSurveys: Array.isArray(surveys) ? surveys.length : 0,
                activeSurveys: Array.isArray(surveys) ? surveys.filter(s => s.isActive).length : 0,
                totalResponses: Array.isArray(surveys) ? surveys.reduce((total, survey) =>
                    total + (Array.isArray(survey.responses) ? survey.responses.length : 0), 0) : 0,
                totalUsers: Array.isArray(users) ? users.length : 0,
                totalBusinesses: Array.isArray(businesses) ? businesses.length : 0
            };

            console.log('Manuel hesaplanan gösterge paneli istatistikleri:', stats);
            return stats;
        } catch (error) {
            console.error('Gösterge paneli istatistikleri hesaplama hatası:', error);
            // Hata durumunda boş değerler döndür
            return {
                totalSurveys: 0,
                activeSurveys: 0,
                totalResponses: 0,
                totalUsers: 0,
                totalBusinesses: 0
            };
        }
    },
};

// Ortalama değerlendirme puanını hesapla
const calculateAverageRating = (surveys: any[]) => {
    if (!Array.isArray(surveys) || surveys.length === 0) return 0;

    let totalRating = 0;
    let totalRatedResponses = 0;

    surveys.forEach(survey => {
        if (Array.isArray(survey.responses)) {
            survey.responses.forEach((response: any) => {
                if (response.rating) {
                    totalRating += response.rating;
                    totalRatedResponses++;
                }
            });
        }
    });

    return totalRatedResponses > 0 ? (totalRating / totalRatedResponses) : 0;
};

// Yanıt oranını hesapla
const calculateResponseRate = (surveys: any[]) => {
    if (!Array.isArray(surveys) || surveys.length === 0) return 0;

    let totalPossibleResponses = 0;
    let totalActualResponses = 0;

    surveys.forEach(survey => {
        // Her anket için potansiyel yanıt sayısı (hedef kitle sayısı)
        const possibleResponses = survey.targetAudience ? survey.targetAudience.length : 0;
        totalPossibleResponses += possibleResponses;

        // Gerçek yanıt sayısı
        const actualResponses = Array.isArray(survey.responses) ? survey.responses.length : 0;
        totalActualResponses += actualResponses;
    });

    return totalPossibleResponses > 0 ? (totalActualResponses / totalPossibleResponses) * 100 : 0;
};

// API bağlantısının iyi durumda olduğunu kontrol et ve sağla
const ensureGoodApiConnection = async () => {
    console.log("API bağlantı kontrolü başlatılıyor...");
    try {
        // Mevcut bağlantıyı test et
        const pingResult = await axios.get(`${BASE_URL}/api/ping`, {
            timeout: 3000,
            validateStatus: () => true,
        }).catch(() => null);

        if (pingResult && pingResult.status < 500) {
            console.log(`✅ Mevcut API bağlantısı (${BASE_URL}) çalışıyor.`);
            return true;
        }

        // Mevcut bağlantı çalışmıyorsa yeni bağlantı bul
        console.log("Mevcut bağlantı çalışmıyor, alternatif bağlantı aranıyor...");
        const workingIp = await tryConnectToIP();

        if (workingIp) {
            console.log(`✅ Çalışan API bağlantısı bulundu: ${workingIp}`);
            BASE_URL = workingIp;
            apiClient.defaults.baseURL = workingIp;
            return true;
        }

        // Hiçbir bağlantı çalışmıyorsa
        console.warn("⚠️ Hiçbir API bağlantısı bulunamadı.");
        return false;
    } catch (error) {
        console.error("API bağlantı kontrolü sırasında hata:", error);
        return false;
    }
};

export default api; 