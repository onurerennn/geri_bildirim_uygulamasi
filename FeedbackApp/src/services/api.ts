import axios, { AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole } from '../context/AuthContext';

// API için sabit yapılandırmalar
const API_CONFIG = {
    DEFAULT_URL: 'http://192.168.1.10:5000',
    TIMEOUT: 15000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    MAX_REDIRECTS: 3
};

// API sağlık durumu için tip tanımı
interface ApiHealthStatus {
    isHealthy: boolean;
    lastChecked: number;
    message: string;
    currentUrl: string;
    pingTime?: number;
}

// API response tipleri
export interface Survey {
    _id: string;
    title: string;
    description: string;
    questions: Array<{
        _id: string;
        text: string;
        type: 'rating' | 'text' | 'multiple_choice';
        options?: string[];
        required: boolean;
    }>;
    business: any;
}

export interface SurveyResponse {
    surveyId: string;
    answers: Array<{
        questionId: string;
        value: string | number;
    }>;
    code?: string;
    customer?: {
        name: string;
        email: string;
    };
}

// Global API durumu
let currentApiUrl = API_CONFIG.DEFAULT_URL;
let apiHealthStatus: ApiHealthStatus = {
    isHealthy: false,
    lastChecked: 0,
    message: 'API henüz kontrol edilmedi',
    currentUrl: currentApiUrl
};

// TypeScript için API fonksiyonlarının arayüzü
interface Api {
    getApiUrl: () => string;
    getCurrentApiUrl: () => string;
    changeApiUrl: (newUrl: string) => { success: boolean; message: string; url: string; };
    testConnection: () => Promise<{ success: boolean; url: string; message: string; }>;
    ping: () => Promise<{ success: boolean; message: string; }>;
    getApiHealthStatus: () => ApiHealthStatus;
    login: (email: string, password: string) => Promise<{ success: boolean; token?: string; data?: any; error?: string; }>;
    register: (userData: { name: string; email: string; password: string }) => Promise<any>;
    getUserProfile: () => Promise<any>;
    getFeedbacks: (token: string) => Promise<any>;
    createFeedback: (token: string, feedbackData: any) => Promise<any>;
    deleteFeedback: (token: string, id: string) => Promise<any>;
    getBusinesses: (token: string) => Promise<any>;
    getBusiness: (token: string, id: string) => Promise<any>;
    createBusiness: (token: string, businessData: any) => Promise<any>;
    updateBusiness: (token: string, id: string, businessData: any) => Promise<any>;
    deleteBusiness: (token: string, id: string) => Promise<any>;
    getUsers: (token: string) => Promise<any>;
    createUser: (token: string, userData: any) => Promise<any>;
    updateUser: (token: string, id: string, userData: any) => Promise<any>;
    deleteUser: (token: string, id: string) => Promise<any>;
    getDashboardStats: (token: string) => Promise<any>;
    getLastSuccessfulApiUrl: () => string | null;
    getSurveyByQRCode: (qrId: string) => Promise<any>;
    getBusinessSurveys: () => Promise<any>;
    getSurveyResponses: (surveyId: string) => Promise<any>;
    getActiveSurveys: () => Promise<any>;
    surveys: {
        getAll: (role: UserRole) => Promise<any>;
        getById: (surveyId: string, role: UserRole) => Promise<any>;
        getByQR: (qrCode: string) => Promise<any>;
        getByCode: (code: string) => Promise<any>;
        getResponses: (surveyId: string) => Promise<any>;
        getStats: (surveyId: string) => Promise<any>;
        recordScan: (code: string) => Promise<any>;
    };
    business: {
        getProfile: () => Promise<any>;
        getStats: () => Promise<any>;
        getCustomers: () => Promise<any>;
    };
    customer: {
        getProfile: () => Promise<any>;
        getRewards: () => Promise<any>;
        getHistory: () => Promise<any>;
    };
    submitSurveyResponse: (surveyId: string, answers: any[], customer?: any) => Promise<any>;
}

// Yönlendirme geçmişini takip etmek için WeakMap kullanımı
const redirectionHistory = new WeakMap<any, Set<string>>();

// Axios istemcisini yapılandırma
const apiClient = axios.create({
    baseURL: currentApiUrl,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: API_CONFIG.TIMEOUT,
    validateStatus: (status) => status >= 200 && status < 500
});

// Request interceptor - geliştirilmiş versiyon
apiClient.interceptors.request.use(
    async (config) => {
        try {
            // Token kontrolü
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // URL yönlendirme mantığı
            if (config.url) {
                // Yönlendirme geçmişini kontrol et
                let history = redirectionHistory.get(config);
                if (!history) {
                    history = new Set<string>();
                    redirectionHistory.set(config, history);
                }

                // Döngü kontrolü
                if (history.has(config.url)) {
                    console.warn('Yönlendirme döngüsü tespit edildi:', config.url);
                    return config;
                }

                // URL'i geçmişe ekle
                history.add(config.url);

                // Yönlendirme sayısını kontrol et
                if (history.size > API_CONFIG.MAX_REDIRECTS) {
                    console.error('Maksimum yönlendirme sayısı aşıldı');
                    throw new Error('Maksimum yönlendirme sayısı aşıldı');
                }

                let newUrl = standardizeEndpoint(config.url);

                if (newUrl !== config.url) {
                    console.log(`Endpoint yönlendiriliyor: ${config.url} -> ${newUrl}`);
                    config.url = newUrl;
                }
            }

            config.baseURL = currentApiUrl;
            return config;
        } catch (error) {
            console.error('Request interceptor hatası:', error);
            return config;
        }
    },
    (error) => {
        console.error('Request interceptor hatası:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - geliştirilmiş versiyon
apiClient.interceptors.response.use(
    (response) => {
        if (response.status === 200 || response.status === 201) {
            return response;
        }

        if (response.status === 404) {
            const originalUrl = response.config.url;
            if (!originalUrl) return response;

            // Yönlendirme geçmişini kontrol et
            const history = redirectionHistory.get(response.config);
            if (history?.has(originalUrl)) {
                console.warn('Bu endpoint için yönlendirme zaten denenmiş:', originalUrl);
                return response;
            }

            const newUrl = findAlternativeEndpoint(originalUrl);
            if (newUrl && newUrl !== originalUrl) {
                console.log('Alternatif endpoint deneniyor:', newUrl);
                return apiClient.request({
                    ...response.config,
                    url: newUrl
                });
            }
        }

        return response;
    },
    async (error) => {
        if (!error.response) {
            console.error('Ağ hatası:', error.message);
            await checkAndUpdateApiHealth();
            return Promise.reject(new Error('Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.'));
        }

        if (error.response.status === 401) {
            await AsyncStorage.removeItem('userToken');
            return Promise.reject(new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.'));
        }

        return Promise.reject(error);
    }
);

// Endpoint standardizasyon fonksiyonu
function standardizeEndpoint(url: string): string {
    // MongoDB ID formatı kontrolü
    const mongoIdPattern = /[a-f\d]{24}/i;
    const matches = url.match(mongoIdPattern);
    const surveyId = matches ? matches[0] : null;

    // Anket yanıtları için endpoint standardizasyonu
    if (surveyId && (
        url.includes('/respond') ||
        url.includes('/submit') ||
        url.includes('/responses') ||
        url.includes('/feedback')
    )) {
        return `/api/surveys/${surveyId}/respond`;
    }

    // Anket endpoint'leri için standardizasyon
    if (url.includes('/api/')) {
        return url
            .replace(/\/api\/customer\/surveys?\//, '/api/surveys/')
            .replace(/\/api\/survey\//, '/api/surveys/')
            .replace(/\/api\/feedback\//, '/api/surveys/')
            .replace(/\/submit/, '/respond')
            .replace(/\/response/, '/respond');
    }

    return url;
}

// Alternatif endpoint bulma fonksiyonu
function findAlternativeEndpoint(originalUrl: string): string | null {
    const endpoints = {
        surveys: ['/api/surveys', '/api/survey', '/api/feedback', '/api/forms'],
        responses: ['/api/surveys/responses', '/api/survey-responses', '/api/feedback-responses'],
        business: ['/api/business/surveys', '/api/business/feedback'],
        customer: ['/api/customer/surveys', '/api/customer/feedback']
    };

    // URL'in hangi kategoriye ait olduğunu bul
    let category: keyof typeof endpoints | null = null;
    for (const [key, patterns] of Object.entries(endpoints)) {
        if (patterns.some(pattern => originalUrl.includes(pattern))) {
            category = key as keyof typeof endpoints;
            break;
        }
    }

    if (!category) return null;

    // Alternatif endpoint'leri dene
    const alternatives = endpoints[category];
    for (const alt of alternatives) {
        if (!originalUrl.includes(alt)) {
            const newUrl = originalUrl.replace(/\/api\/.*?\//, alt + '/');
            return newUrl;
        }
    }

    return null;
}

// API sağlık kontrolü fonksiyonu - geliştirilmiş versiyon
async function checkAndUpdateApiHealth(): Promise<ApiHealthStatus> {
    const startTime = Date.now();
    try {
        const response = await fetch(`${currentApiUrl}/api/ping`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
        });

        apiHealthStatus = {
            isHealthy: response.ok,
            lastChecked: Date.now(),
            message: response.ok ? 'API bağlantısı sağlandı' : `API yanıt kodu: ${response.status}`,
            currentUrl: currentApiUrl,
            pingTime: Date.now() - startTime
        };
    } catch (error: any) {
        apiHealthStatus = {
            isHealthy: false,
            lastChecked: Date.now(),
            message: `API bağlantı hatası: ${error.message}`,
            currentUrl: currentApiUrl,
            pingTime: Date.now() - startTime
        };

        // Bağlantı hatası durumunda yedek URL'leri dene
        await tryBackupUrls();
    }

    return apiHealthStatus;
}

// Yedek URL'leri deneme fonksiyonu
async function tryBackupUrls(): Promise<void> {
    const backupUrls = [
        'http://192.168.1.10:5000',
        'http://192.168.137.1:5000',
        'http://10.0.2.2:5000',
        'http://localhost:5000'
    ].filter(url => url !== currentApiUrl);

    for (const url of backupUrls) {
        try {
            const response = await fetch(`${url}/api/ping`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(3000)
            });

            if (response.ok) {
                console.log(`Çalışan yedek URL bulundu: ${url}`);
                currentApiUrl = url;
                apiClient.defaults.baseURL = url;
                return;
            }
        } catch (error) {
            console.warn(`Yedek URL başarısız: ${url}`);
            continue;
        }
    }
}

// API sağlık monitörü
function startApiHealthMonitor() {
    console.log('API sağlık monitörü başlatılıyor...');

    // İlk kontrol
    checkAndUpdateApiHealth();

    // Periyodik kontrol (30 saniyede bir)
    setInterval(async () => {
        const oldStatus = apiHealthStatus.isHealthy;
        await checkAndUpdateApiHealth();

        if (oldStatus !== apiHealthStatus.isHealthy) {
            console.log(
                `API durumu değişti: ${apiHealthStatus.isHealthy ? 'Çalışıyor' : 'Çalışmıyor'} - ${apiHealthStatus.message}`
            );
        }
    }, 30000);
}

// API için platform bazlı URL - kullanılabilir IP adresleri listesi
const possibleApiUrls = [
    // Önceki başarılı IP'ler - öncelik bunlara verilecek
    'http://192.168.1.10:5000',
    'http://192.168.1.1:5000',
    'http://10.0.0.10:5000',
    // Wi-Fi bağlantıları - ikinci öncelik
    'http://192.168.0.100:5000',
    'http://192.168.1.100:5000',
    // Yerel geliştirme IP'leri
    'http://10.61.0.39:5000',
    'http://192.168.56.1:5000',
    'http://192.168.137.1:5000',
    'http://172.20.10.2:5000',
    'http://172.16.0.10:5000',
    // Platform bazlı varsayılan adresler
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    ...(Platform.OS === 'android' ? ['http://10.0.2.2:5000'] : [])
];

// En son başarılı bağlantı kurulan URL'yi önbelleğe alacağız
let lastSuccessfulUrl: string | null = null;

// API bağlantısının iyi durumda olduğunu kontrol et
const ensureGoodApiConnection = async (): Promise<boolean> => {
    try {
        // Son başarılı URL'yi kontrol et
        if (lastSuccessfulUrl && await isUrlReachable(lastSuccessfulUrl)) {
            console.log(`Son başarılı API bağlantısı kullanılıyor: ${lastSuccessfulUrl}`);
            currentApiUrl = lastSuccessfulUrl;
            apiClient.defaults.baseURL = lastSuccessfulUrl;
            return true;
        }

        // Mevcut URL'yi kontrol et
        if (await isUrlReachable(currentApiUrl)) {
            console.log(`API bağlantısı başarılı: ${currentApiUrl}`);
            lastSuccessfulUrl = currentApiUrl; // Başarılı URL'yi önbelleğe al
            return true;
        }

        // Çalışan alternatif URL ara
        const workingUrl = await findWorkingApiUrl();
        if (workingUrl) {
            console.log(`Çalışan API URL'si bulundu ve ayarlandı: ${workingUrl}`);
            currentApiUrl = workingUrl;
            apiClient.defaults.baseURL = workingUrl;
            return true;
        }

        console.log(`API bağlantısı başarısız: ${currentApiUrl}`);
        return false;
    } catch (error) {
        console.error("API bağlantı kontrolü sırasında hata:", error);
        return false;
    }
};

// Belirli bir URL'ye erişilebilirliği kontrol et
const isUrlReachable = async (url: string): Promise<boolean> => {
    try {
        console.log(`URL erişilebilirlik kontrolü: ${url}/api/ping`);

        // Önce ping endpoint'ini dene
        try {
            const pingResponse = await axios.get(`${url}/api/ping`, {
                timeout: 3000, // 3 saniye - hızlı yanıt için
                validateStatus: (status) => status < 500,
            });

            if (pingResponse.status < 500) {
                console.log(`URL erişim testi başarılı: ${url}`, pingResponse.status);
                return true;
            }
        } catch (pingError) {
            console.log(`Ping endpointine erişilemedi, root URL deneniyor: ${url}`);
        }

        // Ping endpoint'i yoksa root URL'yi dene
        try {
            const rootResponse = await axios.get(url, {
                timeout: 3000, // 3 saniye - hızlı yanıt için
                validateStatus: (status) => status < 500
            });

            return true;
        } catch (rootError) {
            console.log(`Root URL'ye erişilemedi: ${url}`, rootError);
            return false;
        }
    } catch (error) {
        console.log(`URL erişim testi genel hatası: ${url}`, error);
        return false;
    }
};

// Çalışan bir API URL'si bulmak için olası URL'leri dene
const findWorkingApiUrl = async (): Promise<string | null> => {
    console.log("Çalışan API URL'si aranıyor...");

    // Önce son başarılı URL'yi kontrol et
    if (lastSuccessfulUrl && await isUrlReachable(lastSuccessfulUrl)) {
        console.log(`Son başarılı URL kullanılıyor: ${lastSuccessfulUrl}`);
        return lastSuccessfulUrl;
    }

    // Önce mevcut URL'yi kontrol et
    if (await isUrlReachable(currentApiUrl)) {
        console.log(`Mevcut URL çalışıyor: ${currentApiUrl}`);
        lastSuccessfulUrl = currentApiUrl; // Başarılı URL'yi önbelleğe al
        return currentApiUrl;
    }

    // Paralelleştirilmiş URL kontrolleri - daha hızlı keşif
    const urlChecks = possibleApiUrls.map(async (url) => {
        if (url === currentApiUrl) return null; // Mevcut URL'yi atla

        try {
            const isReachable = await isUrlReachable(url);
            return isReachable ? url : null;
        } catch {
            return null;
        }
    });

    // Tüm URL kontrolleri paralel olarak yapılır
    const results = await Promise.all(urlChecks);
    const workingUrl = results.find(url => url !== null);

    if (workingUrl) {
        console.log(`Çalışan alternatif URL bulundu: ${workingUrl}`);
        lastSuccessfulUrl = workingUrl;
        return workingUrl;
    }

    console.log("Hiçbir API URL'si erişilebilir değil.");
    return null;
};

// Benzersiz kod oluşturma fonksiyonu
function generateUniqueCode(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    // İlk harf
    const firstLetter = letters[Math.floor(Math.random() * letters.length)];

    // 2-4 rakam
    const numLength = Math.floor(Math.random() * 3) + 2; // 2-4 arası rakam
    let numbersPart = '';
    for (let i = 0; i < numLength; i++) {
        numbersPart += numbers[Math.floor(Math.random() * numbers.length)];
    }

    // Son harf
    const lastLetter = letters[Math.floor(Math.random() * letters.length)];

    // Anket kısaltması
    const surveyPart = 'SURV';

    // Zaman damgası (son 4 karakter)
    const timestamp = Date.now().toString(36).substr(-4);

    // Tüm parçaları birleştir: A123B-SURV-1234C formatında
    return `${firstLetter}${numbersPart}${lastLetter}-${surveyPart}-${timestamp}`.toUpperCase();
}

// Anket oluştur
const api: Api = {
    getApiUrl: () => currentApiUrl,
    getCurrentApiUrl: () => currentApiUrl,
    changeApiUrl: (newUrl: string) => {
        currentApiUrl = newUrl;
        apiClient.defaults.baseURL = newUrl;
        console.log('API adresi değiştirildi:', newUrl);
        return { success: true, message: `API adresi değiştirildi: ${newUrl}`, url: newUrl };
    },
    testConnection: async () => {
        const status = await checkAndUpdateApiHealth();
        return {
            success: status.isHealthy,
            url: status.currentUrl,
            message: status.message
        };
    },
    ping: async () => {
        try {
            console.log(`Ping testi: ${currentApiUrl}`);
            const isReachable = await isUrlReachable(currentApiUrl);

            if (isReachable) {
                return { success: true, message: `API sunucusu aktif: ${currentApiUrl}` };
            }

            const workingUrl = await findWorkingApiUrl();
            if (workingUrl) {
                currentApiUrl = workingUrl;
                apiClient.defaults.baseURL = workingUrl;
                return { success: true, message: `API sunucusu aktif: ${workingUrl}` };
            }

            return {
                success: false,
                message: `API sunucusuna erişilemiyor: ${currentApiUrl}`
            };
        } catch (error) {
            console.error('API sunucusuna bağlanılamadı:', error);
            return {
                success: false,
                message: 'API sunucusuna bağlanılamadı'
            };
        }
    },
    getApiHealthStatus: () => ({ ...apiHealthStatus }),
    getLastSuccessfulApiUrl: () => lastSuccessfulUrl,
    login: async (email: string, password: string) => {
        try {
            const normalizedEmail = email.toLowerCase().trim();

            const response = await apiClient.post('/api/auth/login', {
                email: normalizedEmail,
                password
            });

            if (response.status === 200 && response.data) {
                if (!response.data.token) {
                    throw new Error('Token alınamadı');
                }

                const userData = response.data.user || response.data.data;
                if (!userData) {
                    throw new Error('Kullanıcı bilgileri alınamadı');
                }

                let userRole = userData.role?.toUpperCase();
                if (!userRole) {
                    userRole = 'CUSTOMER';
                }

                return {
                    success: true,
                    token: response.data.token,
                    data: {
                        ...userData,
                        role: userRole
                    }
                };
            } else {
                throw new Error(response.data?.message || 'Giriş başarısız');
            }
        } catch (error: any) {
            console.error('Login hatası:', error);

            let errorMessage = 'Giriş yapılırken bir hata oluştu';
            if (error.response) {
                switch (error.response.status) {
                    case 401:
                        errorMessage = 'Geçersiz kullanıcı adı veya şifre';
                        break;
                    case 404:
                        errorMessage = 'Kullanıcı bulunamadı';
                        break;
                    case 403:
                        errorMessage = 'Hesabınız kilitlendi. Lütfen yönetici ile iletişime geçin';
                        break;
                    default:
                        errorMessage = error.response.data?.message || 'Sunucu hatası';
                }
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    },
    register: async (userData: { name: string; email: string; password: string }) => {
        try {
            const normalizedUserData = {
                ...userData,
                email: userData.email ? userData.email.toLowerCase().trim() : ''
            };

            await ensureGoodApiConnection();

            const response = await apiClient.post('/api/auth/register', normalizedUserData);
            return response.data;
        } catch (error) {
            console.error('Kayıt hatası:', error);
            throw error;
        }
    },
    getUserProfile: async () => {
        try {
            const response = await apiClient.get('/api/auth/profile');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getFeedbacks: async (token: string) => {
        try {
            await ensureGoodApiConnection();

            const endpoints = [
                '/api/surveys',
                '/api/feedbacks',
                '/api/feedback',
                '/api/forms',
                '/api/survey',
                '/api/business/surveys'
            ];

            let lastError = null;

            for (const endpoint of endpoints) {
                try {
                    console.log(`Anketleri getirme denemesi: ${endpoint}`);
                    const response = await apiClient.get(endpoint, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        timeout: 60000
                    });

                    console.log(`${endpoint} başarılı, veri alındı`);
                    return response.data;
                } catch (endpointError: any) {
                    console.warn(`${endpoint} başarısız: ${endpointError.message}`);
                    lastError = endpointError;
                }
            }

            console.error("Hiçbir anket API endpointi çalışmıyor");
            throw lastError || new Error('Hiçbir anket API endpointi çalışmıyor');
        } catch (error: any) {
            console.error('Anket getirme hatası:', error);

            let errorMessage = 'Anket verileri alınamadı';

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                errorMessage = 'Anket verileri alınırken zaman aşımı oluştu. Lütfen internet bağlantınızı kontrol edin.';
            } else if (error.response) {
                if (error.response.status === 404) {
                    errorMessage = 'Anket verileri bulunamadı. API endpoint mevcut değil.';
                } else {
                    errorMessage = `Sunucu hatası: ${error.response.status} - ${error.response.data?.message || error.message}`;
                }
            } else if (error.request) {
                errorMessage = 'Sunucu yanıt vermiyor. Lütfen internet bağlantınızı kontrol edin.';
            }

            throw new Error(errorMessage);
        }
    },
    createFeedback: async (token: string, feedbackData: any) => {
        try {
            await ensureGoodApiConnection();

            // Benzersiz kod oluştur
            const uniqueCode = generateUniqueCode();

            // Anket verisini hazırla
            const surveyData = {
                title: feedbackData.title,
                description: feedbackData.description,
                startDate: feedbackData.startDate,
                endDate: feedbackData.endDate,
                questions: feedbackData.questions,
                business: feedbackData.business,
                createdBy: feedbackData.business,
                codes: [{
                    value: uniqueCode,
                    type: 'custom',
                    isActive: true,
                    createdAt: new Date().toISOString()
                }],
                accessCodes: [uniqueCode]
            };

            // Veriyi kontrol et
            if (!surveyData.codes || !surveyData.codes[0]?.value) {
                throw new Error('Anket kodu oluşturulamadı');
            }

            // Veriyi logla
            console.log('Gönderilen anket verisi:', JSON.stringify(surveyData, null, 2));

            try {
                // Önce /api/surveys endpoint'ini dene
                const response = await apiClient.post('/api/surveys', surveyData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                return response.data;
            } catch (surveyError: any) {
                console.error('İlk endpoint hatası:', surveyError.response?.data || surveyError.message);

                // İlk endpoint başarısız olursa /api/feedbacks endpoint'ini dene
                try {
                    const altResponse = await apiClient.post('/api/feedbacks', surveyData, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    return altResponse.data;
                } catch (feedbackError: any) {
                    console.error('İkinci endpoint hatası:', feedbackError.response?.data || feedbackError.message);
                    throw new Error('Anket oluşturulamadı. Lütfen daha sonra tekrar deneyin.');
                }
            }
        } catch (error: any) {
            console.error('Anket oluşturma hatası:', error);
            throw error;
        }
    },
    deleteFeedback: async (token: string, id: string) => {
        try {
            await ensureGoodApiConnection();

            try {
                const response = await apiClient.delete(`/api/surveys/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });
                return response.data;
            } catch (surveyError: any) {
                if (surveyError.response && surveyError.response.status === 404) {
                    console.log('surveys endpoint bulunamadı, feedbacks endpoint deneniyor...');
                    const altResponse = await apiClient.delete(`/api/feedbacks/${id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        }
                    });
                    return altResponse.data;
                }
                throw surveyError;
            }
        } catch (error: any) {
            console.error('Anket silme hatası:', error);

            let errorMessage = 'Anket silinemedi';
            if (error.response && error.response.status === 404) {
                errorMessage = 'Anket bulunamadı veya API endpoint mevcut değil.';
            }

            throw new Error(errorMessage);
        }
    },
    getBusinesses: async (token: string) => {
        try {
            await ensureGoodApiConnection();

            const endpoints = [
                '/api/businesses',
                '/api/business',
                '/api/companies',
                '/api/admin/businesses'
            ];

            let lastError;
            for (const endpoint of endpoints) {
                try {
                    console.log(`İşletmeleri getirmek için ${endpoint} deneniyor...`);
                    const response = await apiClient.get(endpoint, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        }
                    });

                    let businessData;

                    if (Array.isArray(response.data)) {
                        businessData = response.data;
                    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                        businessData = response.data.data;
                    } else if (response.data && response.data.businesses && Array.isArray(response.data.businesses)) {
                        businessData = response.data.businesses;
                    } else if (response.data && response.data.items && Array.isArray(response.data.items)) {
                        businessData = response.data.items;
                    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
                        businessData = response.data.results;
                    } else {
                        console.warn(`${endpoint} işletme verisi beklenmeyen formatta:`, response.data);
                        businessData = [];
                    }

                    console.log(`${endpoint} başarılı, ${businessData.length} işletme bulundu`);
                    return businessData;
                } catch (endpointError: any) {
                    lastError = endpointError;
                    console.warn(`${endpoint} işletme hatası:`,
                        endpointError.response?.status || endpointError.message);
                }
            }

            console.error('Hiçbir işletme endpointi başarılı olmadı');
            throw lastError || new Error("İşletme verileri alınamadı. API sunucusuna bağlanılamadı.");
        } catch (error: any) {
            console.error('İşletmeleri getirme hatası:', error);
            throw error;
        }
    },
    getBusiness: async (token: string, id: string) => {
        try {
            await ensureGoodApiConnection();

            const endpoints = [
                `/api/businesses/${id}`,
                `/api/business/${id}`,
                `/api/company/${id}`,
                `/api/business?id=${id}`
            ];

            let lastError = null;

            for (const endpoint of endpoints) {
                try {
                    console.log(`İşletme bilgisi alınıyor: ${endpoint}`);
                    const response = await apiClient.get(endpoint, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        timeout: 60000
                    });

                    console.log(`${endpoint} başarılı, işletme bilgisi alındı`);
                    return response.data;
                } catch (endpointError: any) {
                    console.warn(`${endpoint} başarısız:`, endpointError.message);
                    lastError = endpointError;
                }
            }

            throw lastError || new Error('Hiçbir işletme API endpointi çalışmıyor');
        } catch (error) {
            console.error('İşletme detayı getirme hatası:', error);
            throw error;
        }
    },
    createBusiness: async (token: string, businessData: any) => {
        try {
            await ensureGoodApiConnection();

            const response = await apiClient.post('/api/businesses', businessData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            return response.data;
        } catch (error) {
            console.error('İşletme oluşturma hatası:', error);
            throw error;
        }
    },
    updateBusiness: async (token: string, id: string, businessData: any) => {
        try {
            await ensureGoodApiConnection();

            const response = await apiClient.put(`/api/businesses/${id}`, businessData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            return response.data;
        } catch (error) {
            console.error('İşletme güncelleme hatası:', error);
            throw error;
        }
    },
    deleteBusiness: async (token: string, id: string) => {
        try {
            await ensureGoodApiConnection();

            const response = await apiClient.delete(`/api/businesses/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            return response.data;
        } catch (error) {
            console.error('İşletme silme hatası:', error);
            throw error;
        }
    },
    getUsers: async (token: string) => {
        try {
            await ensureGoodApiConnection();

            try {
                const response = await apiClient.get('/api/users', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });
                return response.data;
            } catch (error) {
                console.error('Kullanıcı getirme hatası:', error);
                throw error;
            }
        } catch (error) {
            console.error('Kullanıcı getirme hatası:', error);
            throw error;
        }
    },
    createUser: async (token: string, userData: any) => {
        try {
            await ensureGoodApiConnection();

            const response = await apiClient.post('/api/users', userData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            return response.data;
        } catch (error) {
            console.error('Kullanıcı oluşturma hatası:', error);
            throw error;
        }
    },
    updateUser: async (token: string, id: string, userData: any) => {
        try {
            await ensureGoodApiConnection();

            const response = await apiClient.put(`/api/users/${id}`, userData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            return response.data;
        } catch (error) {
            console.error('Kullanıcı güncelleme hatası:', error);
            throw error;
        }
    },
    deleteUser: async (token: string, id: string) => {
        try {
            await ensureGoodApiConnection();

            const response = await apiClient.delete(`/api/users/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            return response.data;
        } catch (error) {
            console.error('Kullanıcı silme hatası:', error);
            throw error;
        }
    },
    getDashboardStats: async (token: string) => {
        try {
            const isConnected = await ensureGoodApiConnection();
            if (!isConnected) {
                throw new Error("API sunucusuna bağlanılamadı, lütfen internet bağlantınızı kontrol edin");
            }

            const endpoints = [
                '/api/dashboard/stats',
                '/api/stats',
                '/api/statistics',
                '/api/dashboard',
                '/api/admin/stats',
                '/api/admin/dashboard'
            ];

            let lastError;
            for (const endpoint of endpoints) {
                try {
                    console.log(`İstatistik almak için ${endpoint} deneniyor...`);
                    const result = await apiClient.get(endpoint, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        }
                    });
                    console.log(`${endpoint} başarılı, istatistik verileri alındı`);
                    return result.data;
                } catch (endpointError: any) {
                    lastError = endpointError;
                    console.warn(`${endpoint} istatistik hatası:`,
                        endpointError.response?.status || endpointError.message);
                }
            }

            throw lastError || new Error("İstatistik verileri alınamadı. API sunucusuna bağlanılamadı.");
        } catch (error: any) {
            console.error('İstatistik getirme hatası:', error);
            throw error;
        }
    },
    getSurveyByQRCode: async (qrId: string) => {
        try {
            const response = await apiClient.get(`/api/surveys/access/${qrId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getBusinessSurveys: async () => {
        try {
            const response = await apiClient.get('/api/business/surveys');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getSurveyResponses: async (surveyId: string) => {
        try {
            const response = await apiClient.get(`/api/surveys/${surveyId}/responses`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getActiveSurveys: async () => {
        try {
            await ensureGoodApiConnection();

            const endpoints = [
                '/api/surveys/active',
                '/api/active-surveys',
                '/api/customer/surveys',
                '/api/surveys?status=active'
            ];

            let lastError = null;

            for (const endpoint of endpoints) {
                try {
                    console.log(`Aktif anketler alınıyor: ${endpoint}`);
                    const response = await apiClient.get(endpoint);
                    console.log(`${endpoint} başarılı, aktif anketler alındı`);
                    return response.data;
                } catch (endpointError: any) {
                    console.warn(`${endpoint} başarısız:`, endpointError.message);
                    lastError = endpointError;
                }
            }

            throw lastError || new Error('Aktif anketler alınamadı');
        } catch (error: any) {
            console.error('Aktif anketleri getirme hatası:', error);
            throw error;
        }
    },
    surveys: {
        getAll: async (role: UserRole) => {
            try {
                let endpoints;
                switch (role) {
                    case 'SUPER_ADMIN':
                        endpoints = [
                            '/api/admin/surveys',
                            '/api/admin/surveys',
                            '/api/admin/surveys'
                        ];
                        break;
                    case 'BUSINESS_ADMIN':
                        endpoints = [
                            '/api/business/surveys',
                            '/api/business/surveys',
                            '/api/business/surveys'
                        ];
                        break;
                    case 'CUSTOMER':
                        endpoints = [
                            '/api/customer/surveys',
                            '/api/customer/surveys',
                            '/api/customer/surveys'
                        ];
                        break;
                    default:
                        endpoints = [
                            '/api/surveys',
                            '/api/survey',
                            '/api/feedback',
                            '/api/forms'
                        ];
                }

                let lastError;
                for (const endpoint of endpoints) {
                    try {
                        console.log(`Anketleri getirme denemesi: ${endpoint}`);
                        const response = await apiClient.get(endpoint);
                        return response.data;
                    } catch (error) {
                        console.warn(`${endpoint} başarısız:`, error);
                        lastError = error;
                    }
                }

                throw lastError || new Error('Hiçbir anket endpoint\'i çalışmıyor');
            } catch (error) {
                console.error('Anketleri getirme hatası:', error);
                throw error;
            }
        },
        getById: async (surveyId: string, role: UserRole) => {
            try {
                let endpoint;
                switch (role) {
                    case 'SUPER_ADMIN':
                        endpoint = '/api/admin/surveys';
                        break;
                    case 'BUSINESS_ADMIN':
                        endpoint = '/api/business/surveys';
                        break;
                    case 'CUSTOMER':
                        endpoint = '/api/customer/surveys';
                        break;
                    default:
                        endpoint = '/api/surveys';
                }

                const response = await apiClient.get(`${endpoint}/${surveyId}`);
                return response.data;
            } catch (error) {
                console.error('ID ile anket getirme hatası:', error);
                throw error;
            }
        },
        getByQR: async (qrCode: string) => {
            try {
                const response = await apiClient.get(`/api/surveys/qr/${qrCode}`);
                return response.data;
            } catch (error) {
                throw error;
            }
        },
        getByCode: async (code: string) => {
            try {
                const response = await apiClient.get(`/api/surveys/code/${code}`);
                return response.data;
            } catch (error) {
                throw error;
            }
        },
        getResponses: async (surveyId: string) => {
            try {
                const response = await apiClient.get(`/api/surveys/${surveyId}/responses`);
                return response.data;
            } catch (error) {
                throw error;
            }
        },
        getStats: async (surveyId: string) => {
            try {
                const response = await apiClient.get(`/api/surveys/${surveyId}/stats`);
                return response.data;
            } catch (error) {
                throw error;
            }
        },
        recordScan: async (code: string) => {
            try {
                const response = await apiClient.post('/api/surveys/qr/scan', { code });
                return response.data;
            } catch (error) {
                throw error;
            }
        }
    },
    business: {
        getProfile: async () => {
            try {
                const response = await apiClient.get('/api/business/profile');
                return response.data;
            } catch (error) {
                throw error;
            }
        },
        getStats: async () => {
            try {
                const response = await apiClient.get('/api/business/stats');
                return response.data;
            } catch (error) {
                throw error;
            }
        },
        getCustomers: async () => {
            try {
                const response = await apiClient.get('/api/business/customers');
                return response.data;
            } catch (error) {
                throw error;
            }
        }
    },
    customer: {
        getProfile: async () => {
            try {
                const response = await apiClient.get('/api/customer/profile');
                return response.data;
            } catch (error) {
                throw error;
            }
        },
        getRewards: async () => {
            try {
                const response = await apiClient.get('/api/customer/rewards');
                return response.data;
            } catch (error) {
                throw error;
            }
        },
        getHistory: async () => {
            try {
                const response = await apiClient.get('/api/customer/history');
                return response.data;
            } catch (error) {
                throw error;
            }
        }
    },
    submitSurveyResponse: async (surveyId: string, answers: any[], customer?: any) => {
        try {
            await ensureGoodApiConnection();

            // Veri formatını hazırla ve kontrol et
            const responseData: any = {
                survey: surveyId,
                answers: answers
            };

            // Müşteri bilgisi varsa ekle
            if (customer) {
                responseData.customer = customer;
            }

            console.log(`Anket yanıtı gönderiliyor (${surveyId}):`, JSON.stringify(responseData, null, 2));

            // Tüm API istek header'larına token ekleme
            const token = await AsyncStorage.getItem('userToken');
            const headers: any = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // API çağrısı yap
            const response = await fetch(`${currentApiUrl}/surveys/${surveyId}/responses`, {
                method: 'POST',
                headers,
                body: JSON.stringify(responseData)
            });

            // Başarısız HTTP durum kodları için hata fırlat
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP Hata: ${response.status}`);
            }

            // Başarılı yanıtı döndür
            return await response.json();
        } catch (error) {
            console.error('Anket yanıtı gönderirken hata:', error);
            throw error;
        }
    }
};

// İlk başlatmada API URL'sini test et
(async () => {
    console.log("API URL: İlk başlatma testi yapılıyor");
    await ensureGoodApiConnection();
    console.log('API URL:', currentApiUrl);
})();

// Uygulamanın başlangıcında API sağlık monitörünü başlat
setTimeout(startApiHealthMonitor, 1000);

export default api; 