import api from './api';
import { Survey, SurveyResponse } from '../types/Survey';

export interface CreateSurveyData {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    questions: {
        text: string;
        type: 'rating' | 'text' | 'multiple_choice';
        options?: string[];
        required: boolean;
    }[];
}

export interface QRCode {
    _id: string;
    code: string;
    surveyId: string;
    businessId: string;
    url: string;
    surveyTitle?: string;
    createdAt: string;
    updatedAt: string;
}

export const surveyService = {
    getActiveSurveys: async (): Promise<Survey[]> => {
        try {
            console.log('Calling API for active surveys...');
            const response = await api.get('/api/surveys/active');
            console.log('API response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error in getActiveSurveys:', error);
            throw error;
        }
    },

    getSurvey: async (id: string): Promise<Survey> => {
        const response = await api.get(`/api/surveys/${id}`);
        return response.data;
    },

    submitResponse: async (surveyId: string, responseData: SurveyResponse): Promise<void> => {
        await api.post(`/api/surveys/${surveyId}/responses`, responseData);
    },

    // İşletme yöneticileri için ek metodlar
    createSurvey: async (data: CreateSurveyData): Promise<Survey> => {
        // Deneyeceğimiz endpoint listesi
        const endpoints = [
            '/api/surveys',
            '/api/surveys/', // Slash ile biten alternatif
            '/api/business/surveys'  // İş yeri rotası alternatifi
        ];

        let lastError = null;

        // Her endpointi sırayla dene
        for (const endpoint of endpoints) {
            try {
                console.log(`📤 Anket oluşturma isteği - Endpoint: ${endpoint}`);

                // Tarihleri kontrol et ve düzelt
                const surveyData = { ...data };

                if (surveyData.startDate instanceof Date) {
                    surveyData.startDate = new Date(surveyData.startDate.toISOString());
                }

                if (surveyData.endDate instanceof Date) {
                    surveyData.endDate = new Date(surveyData.endDate.toISOString());
                }

                // API isteğini gönder
                const response = await api.post(endpoint, surveyData);
                console.log(`✅ Anket başarıyla oluşturuldu (${endpoint}):`, response.data);

                // Başarı durumunda sonucu döndür
                return response.data.survey || response.data;
            } catch (error: any) {
                lastError = error;

                // Hata loglaması
                console.error(`❌ Endpoint ${endpoint} başarısız:`, error.message);

                if (error.response) {
                    console.error(`Durum kodu: ${error.response.status}, mesaj:`,
                        error.response.data?.error || error.response.data?.message || 'Bilinmeyen hata');

                    // 401 veya 403 durumunda diğer endpointleri denemeyi bırak
                    if (error.response.status === 401 || error.response.status === 403) {
                        console.error('Yetkilendirme hatası, diğer endpointleri denemiyoruz');
                        throw error;
                    }
                }

                // Son endpoint değilse bir sonraki endpointi dene
                console.log(`Yeni endpoint deneniyor...`);
            }
        }

        // Tüm endpointler başarısız olduysa, son hatayı fırlat
        throw lastError || new Error('Tüm anket oluşturma denemeleri başarısız oldu');
    },

    updateSurvey: async (id: string, data: Partial<Survey>): Promise<Survey> => {
        const response = await api.put(`/api/surveys/${id}`, data);
        return response.data;
    },

    deleteSurvey: async (id: string): Promise<void> => {
        await api.delete(`/api/surveys/${id}`);
    },

    getSurveyResponses: async (surveyId: string): Promise<SurveyResponse[]> => {
        const response = await api.get(`/api/surveys/${surveyId}/responses`);
        return response.data;
    },

    getBusinessSurveys: async (): Promise<Survey[]> => {
        try {
            const response = await api.get('/api/business/surveys');
            return response.data;
        } catch (error) {
            console.error('Error fetching business surveys:', error);
            throw error;
        }
    },

    generateQRCode: async (surveyId: string): Promise<{ url: string }> => {
        const response = await api.post(`/api/surveys/${surveyId}/qrcode`);
        return response.data;
    },

    getSurveyQRCodes: async (surveyId: string): Promise<QRCode[]> => {
        try {
            const response = await api.get(`/api/surveys/qr/survey/${surveyId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching survey QR codes:', error);
            throw error;
        }
    }
};

export default surveyService; 