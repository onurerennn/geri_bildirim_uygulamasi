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
    withCredentials: true,
    timeout: 30000
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

        // Anket oluşturma isteği için özel loglama
        if (config.method === 'post' && config.url === '/api/surveys') {
            console.log('ANKET OLUŞTURMA İSTEĞİ GÖNDERILIYOR');
            console.log('Tam URL:', fullUrl);
            console.log('Headers:', JSON.stringify(config.headers, null, 2));
            console.log('Data:', JSON.stringify(config.data, null, 2));
        }

        console.log('API isteği gönderiliyor:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            fullUrl: fullUrl,
            baseURL: config.baseURL,
            data: config.data ?
                (typeof config.data === 'string' ?
                    'String data: ' + config.data.substring(0, 100) :
                    { ...config.data, password: config.data.password ? '***' : undefined }
                ) : null,
            headers: {
                ...config.headers,
                Authorization: config.headers?.Authorization ? 'Bearer ***' : undefined
            }
        });

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

export default api; 