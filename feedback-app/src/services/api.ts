import axios from 'axios';
import { API_URL } from '../config';

// API URL'i başlangıçta logla
console.log('API başlatılıyor, URL:', API_URL);
console.log('Actual baseURL that will be used:', API_URL);

// LocalStorage güvenli erişim yardımcı fonksiyonları
const safeGetItem = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error(`localStorage.getItem('${key}') hatası:`, error);
        return null;
    }
};

const safeRemoveItem = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`localStorage.removeItem('${key}') hatası:`, error);
    }
};

// Axios örneğini yapılandır
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    withCredentials: false,
    timeout: 60000
});

// Her istekte authentication token'ı ekle
api.interceptors.request.use(
    (config) => {
        // LocalStorage'dan token al
        const token = safeGetItem('token');

        // LocalStorage'dan kullanıcı bilgisini al
        const userStr = safeGetItem('user');
        let userData = null;
        try {
            userData = userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.error('User verisi parse edilemedi:', e);
        }

        console.log('API İsteği - Kullanıcı Bilgileri:', {
            userId: userData?._id,
            userEmail: userData?.email,
            userRole: userData?.role,
            hasBusiness: userData?.business ? true : false,
            businessId: userData?.business || 'YOK'
        });

        // Eğer token varsa, header'a ekle
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
            console.log('Authorization token eklendi:', token.substring(0, 15) + '...');
        } else {
            console.warn('Token bulunamadı, bu istek kimlik doğrulaması olmadan gönderilecek');
        }

        // Full URL'i oluştur ve logla
        const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
        console.log(`📡 API İsteği: ${config.method?.toUpperCase()} ${fullUrl}`);

        // Anket veya işletme ile ilgili istekler için daha detaylı loglama
        if (
            config.url?.includes('survey') ||
            config.url?.includes('business') ||
            config.url?.includes('/all')
        ) {
            console.log('🔍 Anket/İşletme isteği detayları:');
            console.log('URL:', fullUrl);
            console.log('Headers:', JSON.stringify(config.headers, null, 2));
            if (config.method === 'post' || config.method === 'put') {
                console.log('Data:', JSON.stringify(config.data, null, 2));
            }
        }

        return config;
    },
    (error) => {
        console.error('API istek hazırlama hatası:', error);
        return Promise.reject(error);
    }
);

// Yanıt logları ve hata yakalama
api.interceptors.response.use(
    (response) => {
        console.log(`API yanıtı: ${response.status} ${response.config.url}`);
        console.log('Yanıt verisi:', response.data);
        return response;
    },
    (error) => {
        if (error.response) {
            const fullUrl = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
            console.error(`API yanıt hatası: ${error.response.status} ${error.config?.url || 'Bilinmeyen URL'}`, error.response.data);
            console.error('Tam hata URL:', fullUrl);
            console.error('Tam hata detayı:', error);

            // Güvenli veri loglama
            let safeData = 'Veri yok';
            if (error.config?.data) {
                try {
                    const data = typeof error.config.data === 'string'
                        ? JSON.parse(error.config.data)
                        : error.config.data;

                    safeData = {
                        ...data,
                        password: data.password ? '***' : undefined
                    };
                } catch (e) {
                    safeData = `String data (${error.config.data.length} bytes)`;
                }
            }

            console.error('İstek verileri:', safeData);

            // Yetkilendirme hatası kontrolü
            if (error.response.status === 401) {
                console.error('Yetkilendirme hatası, kullanıcı oturumu sonlandırılıyor');
                safeRemoveItem('token');
                safeRemoveItem('user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        } else if (error.request) {
            console.error('Sunucudan yanıt alınamadı', error.request);
            console.error('Tam istek detayı:', error);
        } else {
            console.error('İstek ayarlanırken hata oluştu:', error.message);
            console.error('Tam hata detayı:', error);
        }

        return Promise.reject(error);
    }
);

// API hatasını işle
const handleApiError = (error: any) => {
    console.error("API Hatası:", error);
    if (error.response && error.response.status === 401) {
        // Yetkilendirme hatası
        safeRemoveItem('token');
        safeRemoveItem('user');
        window.location.href = '/login';
    }
};

// Onaylanmamış puan yanıtlarını getir
const getPendingApprovals = async () => {
    try {
        const response = await axios.get('/api/surveys/business/pending-approvals');
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

// Yanıt puanlarını onayla
const approveResponsePoints = async (responseId: string, approvedPoints: number) => {
    try {
        const response = await axios.patch(`/api/surveys/responses/${responseId}/approve-points`, {
            approvedPoints
        });
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

// HTTP istekleri için yardımcı fonksiyonlar
const get = async (url: string, config?: any) => {
    try {
        const response = await api.get(url, config);
        return response;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

const post = async (url: string, data?: any, config?: any) => {
    try {
        // Verilerin JSON formatında gönderildiğinden ve headers'ın doğru olduğundan emin ol
        const fullConfig = {
            headers: {
                'Content-Type': 'application/json'
            },
            ...config
        };

        console.log(`API POST: ${url}`);
        console.log('POST Verileri:', JSON.stringify(data, null, 2));

        const response = await api.post(url, data, fullConfig);
        return response;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

const put = async (url: string, data?: any, config?: any) => {
    try {
        const response = await api.put(url, data, config);
        return response;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

const del = async (url: string, config?: any) => {
    try {
        const response = await api.delete(url, config);
        return response;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

const patch = async (url: string, data?: any, config?: any) => {
    try {
        console.log(`🔧 API PATCH isteği başlatılıyor: ${url}`);
        console.log('PATCH Verileri:', JSON.stringify(data, null, 2));

        // Verilerin JSON formatında gönderildiğinden ve headers'ın doğru olduğundan emin ol
        const fullConfig = {
            headers: {
                'Content-Type': 'application/json'
            },
            ...config
        };

        try {
            const response = await api.patch(url, data, fullConfig);
            console.log(`✅ PATCH isteği başarılı: ${url}`, response.data);
            return response;
        } catch (apiError: any) {
            console.error(`❌ PATCH isteği başarısız: ${url}`);
            console.error('PATCH hata detayları:', {
                status: apiError.response?.status,
                statusText: apiError.response?.statusText,
                data: apiError.response?.data,
                message: apiError.message
            });

            // 500 sunucu hatası durumunda daha fazla ayrıntı
            if (apiError.response?.status === 500) {
                console.error('Sunucu hatası detayları:', {
                    url: apiError.config?.url,
                    baseURL: apiError.config?.baseURL,
                    method: apiError.config?.method,
                    headers: apiError.config?.headers,
                    data: apiError.config?.data,
                    responseType: apiError.response?.headers?.['content-type'],
                    responseSize: apiError.response?.data ?
                        (typeof apiError.response.data === 'string' ?
                            apiError.response.data.length :
                            JSON.stringify(apiError.response.data).length) : 0
                });
            }

            handleApiError(apiError);
            throw apiError;
        }
    } catch (error: any) {
        console.error('❌ PATCH genel hata:', error.message);
        handleApiError(error);
        throw error;
    }
};

// Combine the original api object with the new functions
const apiService = {
    ...api,
    get,
    post,
    put,
    delete: del,
    patch,
    getPendingApprovals,
    approveResponsePoints
};

export default apiService; 