import api from './api';
import { rewardService } from './rewardService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SurveyResponse {
    surveyId: string;
    answers: {
        questionId: string;
        answer: string | string[];
    }[];
}

export const surveyService = {
    // QR kod veya ID ile anket getirme
    getSurveyByQRCode: async (qrId: string) => {
        try {
            // Token kontrolü
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('Oturum açmanız gerekiyor');
            }

            // Kullanıcı rolünü kontrol et
            const userStr = await AsyncStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            if (!user) {
                throw new Error('Kullanıcı bilgisi bulunamadı');
            }

            // CUSTOMER rolü için özel endpoint
            if (user.role === 'CUSTOMER') {
                return await api.getSurveyByQRCode(qrId);
            } else {
                throw new Error('Bu işlem için yetkiniz bulunmuyor');
            }
        } catch (error: any) {
            console.error('Anket getirme hatası:', error);
            throw new Error(error.response?.data?.message || error.message || 'Anket bilgileri alınamadı');
        }
    },

    // İşletmenin anketlerini getirme
    getBusinessSurveys: async () => {
        try {
            // Token kontrolü
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('Oturum açmanız gerekiyor');
            }

            // Kullanıcı rolünü kontrol et
            const userStr = await AsyncStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            if (!user) {
                throw new Error('Kullanıcı bilgisi bulunamadı');
            }

            // Role göre uygun endpoint'i seç
            switch (user.role) {
                case 'CUSTOMER':
                    // Müşteriler için aktif anketleri getir
                    return await api.getActiveSurveys();
                case 'BUSINESS':
                    // İşletmeler için kendi anketlerini getir
                    return await api.getFeedbacks(token);
                case 'ADMIN':
                    // Adminler için tüm anketleri getir
                    return await api.getBusinessSurveys();
                default:
                    throw new Error('Geçersiz kullanıcı rolü');
            }
        } catch (error: any) {
            console.error('İşletme anketleri getirme hatası:', error);
            throw new Error(error.response?.data?.message || error.message || 'İşletme anketleri alınamadı');
        }
    },

    // Anket yanıtlama (sadece CUSTOMER rolü için)
    submitSurveyResponse: async (surveyResponse: SurveyResponse) => {
        try {
            // Token kontrolü
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('Oturum açmanız gerekiyor');
            }

            // Kullanıcı rolünü kontrol et
            const userStr = await AsyncStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            if (!user) {
                throw new Error('Kullanıcı bilgisi bulunamadı');
            }

            if (user.role !== 'CUSTOMER') {
                throw new Error('Sadece müşteriler anket yanıtlayabilir');
            }

            const response = await api.submitSurveyResponse(
                surveyResponse.surveyId,
                surveyResponse.answers
            );

            // Yanıt başarılı ise puan ver
            if (response && response._id) {
                await rewardService.awardPointsForResponse(response._id, surveyResponse.surveyId);
            }

            return response;
        } catch (error: any) {
            console.error('Anket yanıtlama hatası:', error);
            throw new Error(error.response?.data?.message || error.message || 'Anket yanıtları gönderilemedi');
        }
    },

    // Anket yanıtlarını getirme (BUSINESS ve ADMIN rolleri için)
    getSurveyResponses: async (surveyId: string) => {
        try {
            // Token kontrolü
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('Oturum açmanız gerekiyor');
            }

            // Kullanıcı rolünü kontrol et
            const userStr = await AsyncStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            if (!user) {
                throw new Error('Kullanıcı bilgisi bulunamadı');
            }

            if (!['BUSINESS', 'ADMIN'].includes(user.role)) {
                throw new Error('Bu işlem için yetkiniz bulunmuyor');
            }

            const response = await api.getSurveyResponses(surveyId);
            return response;
        } catch (error: any) {
            console.error('Anket yanıtları getirme hatası:', error);
            throw new Error(error.response?.data?.message || error.message || 'Anket yanıtları alınamadı');
        }
    }
};
