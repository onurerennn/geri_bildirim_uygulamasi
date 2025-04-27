import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.2:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Kimlik doğrulama token'ını eklemek ve hata yönetimi için istek yakalayıcı
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        } catch (error) {
            console.error('İstek yakalayıcıda hata:', error);
            return Promise.reject(error);
        }
    },
    (error) => {
        console.error('İstek ayarlanırken hata:', error);
        Alert.alert('Hata', 'İstek ayarlanırken bir hata oluştu.');
        return Promise.reject(error);
    }
);

// Hataları yönetmek için yanıt yakalayıcı
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (!error.response) {
            console.error('Ağ hatası:', error);
            Alert.alert('Ağ Hatası', 'Lütfen internet bağlantınızı kontrol edin.');
            return Promise.reject(error);
        }

        const { status, data } = error.response;

        switch (status) {
            case 401:
                await AsyncStorage.removeItem('token');
                Alert.alert('Oturum Süresi Doldu', 'Lütfen tekrar giriş yapın.');
                break;
            case 403:
                Alert.alert('Erişim Reddedildi', 'Bu işlemi gerçekleştirmek için yetkiniz yok.');
                break;
            case 404:
                Alert.alert('Bulunamadı', 'İstenen kaynak bulunamadı.');
                break;
            case 500:
                Alert.alert('Sunucu Hatası', 'Sunucu kaynaklı bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
                break;
            default:
                Alert.alert('Hata', data?.message || 'Beklenmeyen bir hata oluştu.');
        }

        return Promise.reject(error);
    }
);

export default api; 