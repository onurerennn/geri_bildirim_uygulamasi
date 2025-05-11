import axios, { AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole } from '../context/AuthContext';

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
}

// TypeScript için API fonksiyonlarının arayüzü
interface Api {
    getApiUrl: () => string;
    changeApiUrl: (newUrl: string) => { success: boolean; message: string; url: string; };
    testConnection: () => Promise<{ success: boolean; url: string; message: string; }>;
    ping: () => Promise<{ success: boolean; message: string; }>;
    login: (email: string, password: string) => Promise<any>;
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
    getApiHealthStatus: () => { isHealthy: boolean; lastChecked: number; message: string; };
    getLastSuccessfulApiUrl: () => string | null;
    getSurveyByQRCode: (qrId: string) => Promise<any>;
    getBusinessSurveys: () => Promise<any>;
    submitSurveyResponse: (surveyId: string, answers: any) => Promise<any>;
    getSurveyResponses: (surveyId: string) => Promise<any>;
    getActiveSurveys: () => Promise<any>;
    surveys: {
        getAll: (role: UserRole) => Promise<any>;
        getById: (surveyId: string, role: UserRole) => Promise<any>;
        getByCode: (code: string) => Promise<any>;
        getByQR: (qrCode: string) => Promise<any>;
        submitResponse: (surveyId: string, answers: SurveyResponse) => Promise<any>;
        getResponses: (surveyId: string) => Promise<any>;
        getStats: (surveyId: string) => Promise<any>;
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

// Retry yapılandırması
const RETRY_DELAY = 1000; // milisaniye cinsinden, her deneme arasındaki bekleme süresi
const MAX_RETRIES = 3;    // Bir API isteği için maksimum tekrar deneme sayısı

// Başlangıç URL'i - önce son başarılı URL'yi dene
let BASE_URL = 'http://192.168.1.10:5000'; // Tercih edilen IP ile başla

// Axios istemcisini yapılandırma
const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: 15000
});

// Token interceptor
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const userStr = await AsyncStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
                console.log('Token eklendi:', token.substring(0, 10) + '...');
            }

            // URL yönlendirme mantığı
            if (user?.role && config.url) {
                let newUrl = config.url;

                // Anket endpoint'lerini rol bazlı yönlendir
                if (newUrl.includes('/api/survey') || newUrl.includes('/api/surveys')) {
                    const baseEndpoint = newUrl.includes('/api/survey') ? '/api/survey' : '/api/surveys';
                    const path = newUrl.replace(baseEndpoint, '');

                    switch (user.role) {
                        case 'SUPER_ADMIN':
                            newUrl = `/api/admin/survey${path}`;
                            break;
                        case 'BUSINESS_ADMIN':
                            newUrl = `/api/business/survey${path}`;
                            break;
                        case 'CUSTOMER':
                            newUrl = `/api/customer/survey${path}`;
                            break;
                    }

                    config.url = newUrl;
                    console.log('Endpoint yönlendirildi:', newUrl);
                }
            }

            config.baseURL = BASE_URL;
            console.log('API İsteği:', config.method?.toUpperCase(), config.url);

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

// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        console.log('API Yanıt:', response.status, response.config.url);
        return response;
    },
    async (error) => {
        if (error.response) {
            // Yetki hatası (401) durumunda token'ı temizle
            if (error.response.status === 401) {
                console.log('Yetki hatası, token temizleniyor...');
                await AsyncStorage.removeItem('userToken');
            }

            // Özel hata mesajları
            const errorMessage = error.response.data?.message || 'Bir hata oluştu';
            error.message = `Sunucu hatası: ${error.response.status} - ${errorMessage}`;
        } else if (error.request) {
            error.message = 'Sunucuya ulaşılamıyor';
        }

        console.error('API Hatası:', error.message);
        return Promise.reject(error);
    }
);

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
    if (await isUrlReachable(BASE_URL)) {
        console.log(`Mevcut URL çalışıyor: ${BASE_URL}`);
        lastSuccessfulUrl = BASE_URL; // Başarılı URL'yi önbelleğe al
        return BASE_URL;
    }

    // Paralelleştirilmiş URL kontrolleri - daha hızlı keşif
    const urlChecks = possibleApiUrls.map(async (url) => {
        if (url === BASE_URL) return null; // Mevcut URL'yi atla

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

// API bağlantısının iyi durumda olduğunu kontrol et
const ensureGoodApiConnection = async (): Promise<boolean> => {
    try {
        // Son başarılı URL'yi kontrol et
        if (lastSuccessfulUrl && await isUrlReachable(lastSuccessfulUrl)) {
            console.log(`Son başarılı API bağlantısı kullanılıyor: ${lastSuccessfulUrl}`);
            BASE_URL = lastSuccessfulUrl;
            apiClient.defaults.baseURL = lastSuccessfulUrl;
            return true;
        }

        // Mevcut URL'yi kontrol et
        if (await isUrlReachable(BASE_URL)) {
            console.log(`API bağlantısı başarılı: ${BASE_URL}`);
            lastSuccessfulUrl = BASE_URL; // Başarılı URL'yi önbelleğe al
            return true;
        }

        // Çalışan alternatif URL ara
        const workingUrl = await findWorkingApiUrl();
        if (workingUrl) {
            console.log(`Çalışan API URL'si bulundu ve ayarlandı: ${workingUrl}`);
            BASE_URL = workingUrl;
            apiClient.defaults.baseURL = workingUrl;
            return true;
        }

        console.log(`API bağlantısı başarısız: ${BASE_URL}`);
        return false;
    } catch (error) {
        console.error("API bağlantı kontrolü sırasında hata:", error);
        return false;
    }
};

// Yardımcı fonksiyon: Yeniden deneme mekanizması
const fetchWithRetry = async (
    url: string,
    options: any = {},
    maxRetries: number = 3,
    retryDelay: number = 1000
): Promise<any> => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`Yeniden deneme (${attempt}/${maxRetries}): ${url}`);
            }

            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            lastError = error;

            // Bağlantıyı kontrol et ve belki farklı bir URL dene
            if (attempt < maxRetries - 1) {
                try {
                    const isConnected = await ensureGoodApiConnection();
                    if (isConnected && url.includes(BASE_URL)) {
                        // URL değiştiğinde, request URL'ini güncelle
                        url = url.replace(
                            url.substring(0, url.indexOf('/api')),
                            BASE_URL
                        );
                    }
                } catch (e) {
                    // Bağlantı kontrolü başarısız olsa bile devam et
                }

                // Yeniden denemeden önce bekle
                await new Promise(r => setTimeout(r, retryDelay));
            }
        }
    }

    throw lastError;
};

// Interceptor'larla ve retry mekanizmasıyla API isteği gönderen fonksiyon
const apiRequest = async (
    method: string,
    endpoint: string,
    token?: string,
    data?: any,
    retries: number = 3
) => {
    // API bağlantısını kontrol et
    try {
        await ensureGoodApiConnection();
    } catch (e) {
        console.warn("API bağlantısı kontrol edilemedi, istek yine de gönderilecek");
    }

    try {
        const headers: any = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config: any = {
            method: method,
            url: endpoint,
            headers: headers,
            _retryCount: 0,
            maxRetries: retries,
            timeout: 15000 // 15 saniye
        };

        if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
            config.data = data;
        }

        const response = await apiClient(config);
        return response.data;
    } catch (error: any) {
        console.error(`API İsteği Başarısız: ${endpoint}`, error);
        throw error;
    }
};

// TypeScript interfaces for API health
interface ApiHealthStatus {
    isHealthy: boolean;
    lastChecked: number;
    message: string;
    pingTime?: number; // Optional for performance metrics
}

let apiBaseUrl = 'http://192.168.1.10:5000'; // Varsayılan
let lastSuccessfulApiUrl: string | null = null; // Son başarılı API URL'si
let apiHealthStatus: ApiHealthStatus = { isHealthy: false, lastChecked: 0, message: 'API henüz kontrol edilmedi' };
let serverStatusMonitorActive = false;

// API Sağlık durumunu düzenli kontrol eden bir zamanlayıcı
const startApiHealthMonitor = () => {
    if (serverStatusMonitorActive) return; // Zaten aktifse çıkış yap

    console.log('API sağlık monitörü başlatılıyor...');
    serverStatusMonitorActive = true;

    // İlk kontrol
    checkApiHealth().then(status => {
        console.log(`İlk API sağlık kontrolü: ${status.isHealthy ? 'Başarılı' : 'Başarısız'} - ${status.message}`);
    });

    // Her 30 saniyede bir arka planda kontrol et
    setInterval(() => {
        checkApiHealth().then(status => {
            // Durum değiştiyse logla
            if (status.isHealthy !== apiHealthStatus.isHealthy) {
                console.log(`API sağlık durumu değişti: ${status.isHealthy ? 'Bağlantı kuruldu' : 'Bağlantı kesildi'} - ${status.message}`);
            }
        });
    }, 30000); // 30 saniye
};

// API'nin sağlık durumunu kontrol et
const checkApiHealth = async (): Promise<ApiHealthStatus> => {
    const startTime = Date.now();
    try {
        // Mevcut base URL ile ping endpoint'ini test et
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye timeout

        const response = await fetch(`${apiBaseUrl}/api/ping`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            apiHealthStatus = {
                isHealthy: true,
                lastChecked: Date.now(),
                message: `API bağlantısı sağlandı: ${apiBaseUrl}`,
                pingTime: Date.now() - startTime
            };
            lastSuccessfulApiUrl = apiBaseUrl;
            return apiHealthStatus;
        }

        apiHealthStatus = {
            isHealthy: false,
            lastChecked: Date.now(),
            message: `API yanıt verdi fakat durum kodu: ${response.status}`,
            pingTime: Date.now() - startTime
        };
        return apiHealthStatus;
    } catch (error: any) {
        apiHealthStatus = {
            isHealthy: false,
            lastChecked: Date.now(),
            message: `API bağlantı hatası: ${error.message || 'Bilinmeyen hata'}`,
            pingTime: Date.now() - startTime
        };
        return apiHealthStatus;
    }
};

// Uygulamanın açılışında API sağlık monitörünü başlat
setTimeout(startApiHealthMonitor, 1000);

// API endpoint'leri için sabit tanımlamalar
const API_ENDPOINTS = {
    auth: {
        login: '/api/auth/login',
        register: '/api/auth/register',
        profile: '/api/auth/profile',
        refreshToken: '/api/auth/refresh-token'
    },
    surveys: {
        base: '/api/survey',  // Tekil form
        list: '/api/surveys', // Çoğul form
        create: '/api/survey/create',
        byId: (id: string) => `/api/survey/${id}`,
        byQR: (code: string) => `/api/survey/qr/${code}`,
        byCode: (code: string) => `/api/survey/code/${code}`,
        respond: (id: string) => `/api/survey/${id}/respond`,
        responses: (id: string) => `/api/survey/${id}/responses`,
        stats: (id: string) => `/api/survey/${id}/stats`,
        active: '/api/survey/active',
        all: '/api/surveys/all'
    },
    business: {
        base: '/api/business',
        surveys: '/api/business/survey', // Tekil
        surveysList: '/api/business/surveys', // Çoğul
        customers: '/api/business/customers',
        stats: '/api/business/stats',
        profile: '/api/business/profile',
        createSurvey: '/api/business/survey/create',
        updateSurvey: (id: string) => `/api/business/survey/${id}`,
        deleteSurvey: (id: string) => `/api/business/survey/${id}`,
        getSurvey: (id: string) => `/api/business/survey/${id}`
    },
    admin: {
        base: '/api/admin',
        users: '/api/admin/users',
        businesses: '/api/admin/businesses',
        stats: '/api/admin/stats',
        logs: '/api/admin/logs',
        surveys: '/api/admin/survey', // Tekil
        surveysList: '/api/admin/surveys', // Çoğul
        createSurvey: '/api/admin/survey/create',
        updateSurvey: (id: string) => `/api/admin/survey/${id}`,
        deleteSurvey: (id: string) => `/api/admin/survey/${id}`,
        getSurvey: (id: string) => `/api/admin/survey/${id}`
    },
    customer: {
        base: '/api/customer',
        surveys: '/api/customer/survey', // Tekil
        surveysList: '/api/customer/surveys', // Çoğul
        rewards: '/api/customer/rewards',
        profile: '/api/customer/profile',
        history: '/api/customer/history',
        respond: '/api/customer/survey/respond',
        getSurvey: (id: string) => `/api/customer/survey/${id}`
    }
};

// Alternatif endpoint'ler - yedek olarak kullanılacak
const FALLBACK_ENDPOINTS = {
    survey: [
        '/api/survey',
        '/api/surveys',
        '/api/feedback',
        '/api/feedbacks'
    ],
    business: [
        '/api/business/survey',
        '/api/business/surveys',
        '/api/business/feedback',
        '/api/business/feedbacks'
    ],
    admin: [
        '/api/admin/survey',
        '/api/admin/surveys',
        '/api/admin/feedback',
        '/api/admin/feedbacks'
    ],
    customer: [
        '/api/customer/survey',
        '/api/customer/surveys',
        '/api/customer/feedback',
        '/api/customer/feedbacks'
    ]
};

// Anket servisleri için güncellenmiş fonksiyonlar
const surveyService = {
    // Tüm anketleri getir (rol bazlı)
    getAll: async (role: UserRole) => {
        try {
            let endpoints;
            switch (role) {
                case 'SUPER_ADMIN':
                    endpoints = [
                        API_ENDPOINTS.admin.surveysList,
                        ...FALLBACK_ENDPOINTS.admin
                    ];
                    break;
                case 'BUSINESS_ADMIN':
                    endpoints = [
                        API_ENDPOINTS.business.surveysList,
                        ...FALLBACK_ENDPOINTS.business
                    ];
                    break;
                case 'CUSTOMER':
                    endpoints = [
                        API_ENDPOINTS.customer.surveysList,
                        ...FALLBACK_ENDPOINTS.customer
                    ];
                    break;
                default:
                    endpoints = [
                        API_ENDPOINTS.surveys.list,
                        ...FALLBACK_ENDPOINTS.survey
                    ];
            }

            let lastError;
            // Her endpoint'i sırayla dene
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

    // ID ile anket getir
    getById: async (surveyId: string, role: UserRole) => {
        try {
            let endpoint;
            switch (role) {
                case 'SUPER_ADMIN':
                    endpoint = API_ENDPOINTS.admin.getSurvey(surveyId);
                    break;
                case 'BUSINESS_ADMIN':
                    endpoint = API_ENDPOINTS.business.getSurvey(surveyId);
                    break;
                case 'CUSTOMER':
                    endpoint = API_ENDPOINTS.customer.getSurvey(surveyId);
                    break;
                default:
                    endpoint = API_ENDPOINTS.surveys.byId(surveyId);
            }

            const response = await apiClient.get(endpoint);
            return response.data;
        } catch (error) {
            console.error('ID ile anket getirme hatası:', error);
            throw error;
        }
    },

    // Kod ile anket getir
    getByCode: async (code: string) => {
        try {
            const endpoints = [
                API_ENDPOINTS.surveys.byCode(code),
                `/api/survey/code/${code}`,
                `/api/surveys/code/${code}`,
                `/api/feedback/code/${code}`
            ];

            let lastError;
            for (const endpoint of endpoints) {
                try {
                    const response = await apiClient.get(endpoint);
                    return response.data;
                } catch (error) {
                    lastError = error;
                }
            }

            throw lastError || new Error('Anket kodu ile erişim başarısız');
        } catch (error) {
            console.error('Kod ile anket getirme hatası:', error);
            throw error;
        }
    },

    // Anket yanıtı gönder
    submitResponse: async (surveyId: string, answers: SurveyResponse) => {
        try {
            const endpoints = [
                API_ENDPOINTS.surveys.respond(surveyId),
                `/api/survey/${surveyId}/respond`,
                `/api/surveys/${surveyId}/respond`,
                `/api/customer/survey/respond`
            ];

            let lastError;
            for (const endpoint of endpoints) {
                try {
                    const response = await apiClient.post(endpoint, answers);
                    return response.data;
                } catch (error) {
                    lastError = error;
                }
            }

            throw lastError || new Error('Anket yanıtı gönderilemedi');
        } catch (error) {
            console.error('Anket yanıtı gönderme hatası:', error);
            throw error;
        }
    },

    // QR kod ile anket getir
    getByQR: async (qrCode: string) => {
        try {
            const endpoints = [
                API_ENDPOINTS.surveys.byQR(qrCode),
                `/api/survey/qr/${qrCode}`,
                `/api/surveys/qr/${qrCode}`,
                `/api/feedback/qr/${qrCode}`
            ];

            let lastError;
            for (const endpoint of endpoints) {
                try {
                    const response = await apiClient.get(endpoint);
                    return response.data;
                } catch (error) {
                    lastError = error;
                }
            }

            throw lastError || new Error('QR kod ile anket erişimi başarısız');
        } catch (error) {
            console.error('QR kod ile anket getirme hatası:', error);
            throw error;
        }
    },

    // Anket yanıtlarını getir
    getResponses: async (surveyId: string) => {
        try {
            const endpoints = [
                API_ENDPOINTS.surveys.responses(surveyId),
                `/api/survey/${surveyId}/responses`,
                `/api/surveys/${surveyId}/responses`,
                `/api/feedback/${surveyId}/responses`
            ];

            let lastError;
            for (const endpoint of endpoints) {
                try {
                    const response = await apiClient.get(endpoint);
                    return response.data;
                } catch (error) {
                    lastError = error;
                }
            }

            throw lastError || new Error('Anket yanıtları alınamadı');
        } catch (error) {
            console.error('Anket yanıtlarını getirme hatası:', error);
            throw error;
        }
    },

    // Anket istatistiklerini getir
    getStats: async (surveyId: string) => {
        try {
            const endpoints = [
                API_ENDPOINTS.surveys.stats(surveyId),
                `/api/survey/${surveyId}/stats`,
                `/api/surveys/${surveyId}/stats`,
                `/api/feedback/${surveyId}/stats`
            ];

            let lastError;
            for (const endpoint of endpoints) {
                try {
                    const response = await apiClient.get(endpoint);
                    return response.data;
                } catch (error) {
                    lastError = error;
                }
            }

            throw lastError || new Error('Anket istatistikleri alınamadı');
        } catch (error) {
            console.error('Anket istatistiklerini getirme hatası:', error);
            throw error;
        }
    }
};

// API nesnesini güncelle
const api: Api = {
    // API URL'sini döndüren yardımcı fonksiyon
    getApiUrl: () => BASE_URL,

    // API adresini değiştir
    changeApiUrl: (newUrl: string) => {
        BASE_URL = newUrl;
        apiClient.defaults.baseURL = newUrl;
        console.log('API adresi değiştirildi:', newUrl);
        return { success: true, message: `API adresi değiştirildi: ${newUrl}`, url: newUrl };
    },

    // API bağlantısını test et
    testConnection: async () => {
        console.log('API bağlantısı test ediliyor...');
        try {
            const isConnected = await ensureGoodApiConnection();

            if (isConnected) {
                return {
                    success: true,
                    url: BASE_URL,
                    message: `API bağlantısı başarılı: ${BASE_URL}`
                };
            }

            return {
                success: false,
                url: BASE_URL,
                message: `API bağlantısı başarısız: ${BASE_URL}`
            };
        } catch (error: any) {
            console.error('API bağlantı testi hatası:', error);
            return {
                success: false,
                url: BASE_URL,
                message: "API test hatası: " + error.message
            };
        }
    },

    // API sunucusuna ping atarak çalışıp çalışmadığını kontrol eder
    ping: async () => {
        try {
            console.log(`Ping testi: ${BASE_URL}`);
            const isReachable = await isUrlReachable(BASE_URL);

            if (isReachable) {
                return { success: true, message: `API sunucusu aktif: ${BASE_URL}` };
            }

            // Alternatif URL'leri dene
            const workingUrl = await findWorkingApiUrl();
            if (workingUrl) {
                BASE_URL = workingUrl;
                apiClient.defaults.baseURL = workingUrl;
                return { success: true, message: `API sunucusu aktif: ${workingUrl}` };
            }

            return {
                success: false,
                message: `API sunucusuna erişilemiyor: ${BASE_URL}`
            };
        } catch (error) {
            console.error('API sunucusuna bağlanılamadı:', error);
            return {
                success: false,
                message: 'API sunucusuna bağlanılamadı'
            };
        }
    },

    // Kullanıcı girişi
    login: async (email: string, password: string) => {
        try {
            const response = await apiClient.post('/api/auth/login', { email, password });

            // Token'ı kaydet
            if (response.data.token) {
                await AsyncStorage.setItem('userToken', response.data.token);
                console.log('Token kaydedildi');
            }

            return response.data;
        } catch (error) {
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

            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            const response = await apiClient.post('/api/auth/register', normalizedUserData);
            return response.data;
        } catch (error) {
            console.error('Kayıt hatası:', error);
            throw error;
        }
    },

    // Kullanıcı profil bilgilerini getir
    getUserProfile: async () => {
        try {
            const response = await apiClient.get('/api/auth/profile');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Anketleri getir
    getFeedbacks: async (token: string) => {
        try {
            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            // Tüm olası endpoints
            const endpoints = [
                '/api/surveys',
                '/api/feedbacks',
                '/api/feedback',
                '/api/forms',
                '/api/survey',
                '/api/business/surveys'
            ];

            let lastError = null;

            // Her bir endpoint'i sırayla dene
            for (const endpoint of endpoints) {
                try {
                    console.log(`Anketleri getirme denemesi: ${endpoint}`);
                    const response = await apiClient.get(endpoint, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        timeout: 60000 // 60 saniye (artırıldı)
                    });

                    console.log(`${endpoint} başarılı, veri alındı`);
                    return response.data;
                } catch (endpointError: any) {
                    console.warn(`${endpoint} başarısız: ${endpointError.message}`);
                    lastError = endpointError;
                    // Devam et ve bir sonraki endpoint'i dene
                }
            }

            // Hiçbir endpoint çalışmadıysa, son hatayı fırlat
            console.error("Hiçbir anket API endpointi çalışmıyor");
            throw lastError || new Error('Hiçbir anket API endpointi çalışmıyor');
        } catch (error: any) {
            console.error('Anket getirme hatası:', error);

            // Hata mesajını daha ayrıntılı oluştur
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

    // Anket oluştur
    createFeedback: async (token: string, feedbackData: any) => {
        try {
            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            try {
                // Önce /api/surveys endpoint'ini dene
                const response = await apiClient.post('/api/surveys', feedbackData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    timeout: 30000
                });
                return response.data;
            } catch (surveyError: any) {
                // Eğer 404 hatası alırsak, alternatif endpoint'i dene
                if (surveyError.response && surveyError.response.status === 404) {
                    console.log('surveys endpoint bulunamadı, feedbacks endpoint deneniyor...');
                    const altResponse = await apiClient.post('/api/feedbacks', feedbackData, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        timeout: 30000
                    });
                    return altResponse.data;
                }
                // Başka bir hata varsa yeniden fırlat
                throw surveyError;
            }
        } catch (error: any) {
            console.error('Anket oluşturma hatası:', error);

            // Hata mesajını daha ayrıntılı oluştur
            let errorMessage = 'Anket oluşturulamadı';

            if (error.response && error.response.status === 404) {
                errorMessage = 'Anket oluşturma API endpoint\'i bulunamadı.';
            } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                errorMessage = 'Anket oluşturma işlemi zaman aşımına uğradı.';
            }

            throw new Error(errorMessage);
        }
    },

    // Anket sil
    deleteFeedback: async (token: string, id: string) => {
        try {
            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            try {
                // Önce surveys endpoint'ini dene
                const response = await apiClient.delete(`/api/surveys/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });
                return response.data;
            } catch (surveyError: any) {
                // Eğer 404 hatası alırsak, alternatif endpoint'i dene
                if (surveyError.response && surveyError.response.status === 404) {
                    console.log('surveys endpoint bulunamadı, feedbacks endpoint deneniyor...');
                    const altResponse = await apiClient.delete(`/api/feedbacks/${id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        }
                    });
                    return altResponse.data;
                }
                // Başka bir hata varsa yeniden fırlat
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

    // İşletmeleri getir
    getBusinesses: async (token: string) => {
        try {
            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            // İşletmeleri getirmek için alternatif endpointleri dene
            const endpoints = [
                '/api/businesses',
                '/api/business',
                '/api/companies',
                '/api/admin/businesses'
            ];

            let lastError;
            // Her bir endpoint'i sırayla dene
            for (const endpoint of endpoints) {
                try {
                    console.log(`İşletmeleri getirmek için ${endpoint} deneniyor...`);
                    const response = await apiClient.get(endpoint, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        }
                    });

                    // API yanıtı formatını kontrol et
                    let businessData;

                    if (Array.isArray(response.data)) {
                        // Direkt dizi döndüyse
                        businessData = response.data;
                    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                        // { data: [...] } formatında
                        businessData = response.data.data;
                    } else if (response.data && response.data.businesses && Array.isArray(response.data.businesses)) {
                        // { businesses: [...] } formatında
                        businessData = response.data.businesses;
                    } else if (response.data && response.data.items && Array.isArray(response.data.items)) {
                        // { items: [...] } formatında
                        businessData = response.data.items;
                    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
                        // { results: [...] } formatında
                        businessData = response.data.results;
                    } else {
                        // Bilinmeyen format, muhtemelen boş
                        console.warn(`${endpoint} işletme verisi beklenmeyen formatta:`, response.data);
                        businessData = [];
                    }

                    console.log(`${endpoint} başarılı, ${businessData.length} işletme bulundu`);
                    return businessData;
                } catch (endpointError: any) {
                    lastError = endpointError;
                    console.warn(`${endpoint} işletme hatası:`,
                        endpointError.response?.status || endpointError.message);
                    // Bir sonraki endpoint'i dene
                }
            }

            // Hiçbir endpoint başarılı olmadıysa, hata fırlat
            console.error('Hiçbir işletme endpointi başarılı olmadı');
            throw lastError || new Error("İşletme verileri alınamadı. API sunucusuna bağlanılamadı.");
        } catch (error: any) {
            console.error('İşletmeleri getirme hatası:', error);
            throw error;
        }
    },

    // İşletme bilgisi
    getBusiness: async (token: string, id: string) => {
        try {
            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            // Olası endpoint'ler
            const endpoints = [
                `/api/businesses/${id}`,
                `/api/business/${id}`,
                `/api/company/${id}`,
                `/api/business?id=${id}`
            ];

            let lastError = null;

            // Her bir endpoint'i dene
            for (const endpoint of endpoints) {
                try {
                    console.log(`İşletme bilgisi alınıyor: ${endpoint}`);
                    const response = await apiClient.get(endpoint, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        timeout: 60000 // 60 saniye
                    });

                    console.log(`${endpoint} başarılı, işletme bilgisi alındı`);
                    return response.data;
                } catch (endpointError: any) {
                    console.warn(`${endpoint} başarısız:`, endpointError.message);
                    lastError = endpointError;
                    // Devam et ve sonraki endpoint'i dene
                }
            }

            // Hiçbir endpoint çalışmadıysa, son hatayı fırlat
            throw lastError || new Error('Hiçbir işletme API endpointi çalışmıyor');
        } catch (error) {
            console.error('İşletme detayı getirme hatası:', error);
            throw error;
        }
    },

    // İşletme oluştur
    createBusiness: async (token: string, businessData: any) => {
        try {
            // API bağlantısını kontrol et
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

    // İşletme güncelle
    updateBusiness: async (token: string, id: string, businessData: any) => {
        try {
            // API bağlantısını kontrol et
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

    // İşletme sil
    deleteBusiness: async (token: string, id: string) => {
        try {
            // API bağlantısını kontrol et
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

    // Kullanıcı listesi
    getUsers: async (token: string) => {
        try {
            // API bağlantısını kontrol et
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

    // Kullanıcı oluştur
    createUser: async (token: string, userData: any) => {
        try {
            // API bağlantısını kontrol et
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

    // Kullanıcı güncelle
    updateUser: async (token: string, id: string, userData: any) => {
        try {
            // API bağlantısını kontrol et
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

    // Kullanıcı sil
    deleteUser: async (token: string, id: string) => {
        try {
            // API bağlantısını kontrol et
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

    // Gösterge paneli istatistiklerini getir
    getDashboardStats: async (token: string) => {
        try {
            // API bağlantısını kontrol et
            const isConnected = await ensureGoodApiConnection();
            if (!isConnected) {
                throw new Error("API sunucusuna bağlanılamadı, lütfen internet bağlantınızı kontrol edin");
            }

            // Alternatif endpoint'leri dene
            const endpoints = [
                '/api/dashboard/stats',
                '/api/stats',
                '/api/statistics',
                '/api/dashboard',
                '/api/admin/stats',
                '/api/admin/dashboard'
            ];

            let lastError;
            // Her bir endpoint'i sırayla dene
            for (const endpoint of endpoints) {
                try {
                    console.log(`İstatistik almak için ${endpoint} deneniyor...`);
                    const result = await apiRequest('get', endpoint, token);
                    console.log(`${endpoint} başarılı, istatistik verileri alındı`);
                    return result;
                } catch (endpointError: any) {
                    lastError = endpointError;
                    console.warn(`${endpoint} istatistik hatası:`,
                        endpointError.response?.status || endpointError.message);
                    // Bir sonraki endpoint'i dene
                }
            }

            // Hiçbir endpoint çalışmadıysa, hatayı fırlat
            throw lastError || new Error("İstatistik verileri alınamadı. API sunucusuna bağlanılamadı.");
        } catch (error: any) {
            console.error('İstatistik getirme hatası:', error);
            throw error;
        }
    },

    // API sağlık durumu bilgisi
    getApiHealthStatus: () => {
        return { ...apiHealthStatus }; // Kopya döndür
    },

    // Son başarılı çalışan API URL'sini döndür
    getLastSuccessfulApiUrl: () => {
        return lastSuccessfulApiUrl;
    },

    // Anket servisleri
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

    submitSurveyResponse: async (surveyId: string, answers: any) => {
        try {
            const response = await apiClient.post(`/api/surveys/${surveyId}/respond`, answers);
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

    // Aktif anketleri getir (müşteriler için)
    getActiveSurveys: async () => {
        try {
            // API bağlantısını kontrol et
            await ensureGoodApiConnection();

            // Olası endpoint'ler
            const endpoints = [
                '/api/surveys/active',
                '/api/active-surveys',
                '/api/customer/surveys',
                '/api/surveys?status=active'
            ];

            let lastError = null;

            // Her bir endpoint'i dene
            for (const endpoint of endpoints) {
                try {
                    console.log(`Aktif anketler alınıyor: ${endpoint}`);
                    const response = await apiClient.get(endpoint);
                    console.log(`${endpoint} başarılı, aktif anketler alındı`);
                    return response.data;
                } catch (endpointError: any) {
                    console.warn(`${endpoint} başarısız:`, endpointError.message);
                    lastError = endpointError;
                    // Devam et ve sonraki endpoint'i dene
                }
            }

            // Hiçbir endpoint çalışmadıysa, son hatayı fırlat
            throw lastError || new Error('Aktif anketler alınamadı');
        } catch (error: any) {
            console.error('Aktif anketleri getirme hatası:', error);
            throw error;
        }
    },

    surveys: surveyService,

    // İşletme servisleri
    business: {
        getProfile: async () => {
            try {
                const response = await apiClient.get(API_ENDPOINTS.business.profile);
                return response.data;
            } catch (error) {
                console.error('İşletme profili getirme hatası:', error);
                throw error;
            }
        },

        getStats: async () => {
            try {
                const response = await apiClient.get(API_ENDPOINTS.business.stats);
                return response.data;
            } catch (error) {
                console.error('İşletme istatistikleri getirme hatası:', error);
                throw error;
            }
        },

        getCustomers: async () => {
            try {
                const response = await apiClient.get(API_ENDPOINTS.business.customers);
                return response.data;
            } catch (error) {
                console.error('Müşteri listesi getirme hatası:', error);
                throw error;
            }
        }
    },

    // Müşteri servisleri
    customer: {
        getProfile: async () => {
            try {
                const response = await apiClient.get(API_ENDPOINTS.customer.profile);
                return response.data;
            } catch (error) {
                console.error('Müşteri profili getirme hatası:', error);
                throw error;
            }
        },

        getRewards: async () => {
            try {
                const response = await apiClient.get(API_ENDPOINTS.customer.rewards);
                return response.data;
            } catch (error) {
                console.error('Ödül bilgileri getirme hatası:', error);
                throw error;
            }
        },

        getHistory: async () => {
            try {
                const response = await apiClient.get(API_ENDPOINTS.customer.history);
                return response.data;
            } catch (error) {
                console.error('Geçmiş anket bilgileri getirme hatası:', error);
                throw error;
            }
        }
    }
};

// İlk başlatmada API URL'sini test et
(async () => {
    console.log("API URL: İlk başlatma testi yapılıyor");
    await ensureGoodApiConnection();
    console.log('API URL:', BASE_URL);
})();

export default api; 