import api from './api';
import { Survey, Response } from '../types';

export interface CreateSurveyData {
    title: string;
    description: string;
    questions: {
        text: string;
        type: 'rating' | 'text' | 'multiple_choice';
        options?: string[];
        required: boolean;
    }[];
    startDate: Date;
    endDate: Date;
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

const surveyService = {
    // Aktif anketleri getir
    async getActiveSurveys(): Promise<Survey[]> {
        try {
            console.log('Aktif anketler getiriliyor...');
            const response = await api.get('/surveys/active');
            return response.data;
        } catch (error) {
            console.error('Aktif anketleri getirme hatası:', error);
            throw error;
        }
    },

    // Belirli bir anketi getir
    async getSurvey(id: string): Promise<Survey> {
        const response = await api.get(`/surveys/${id}`);
        return response.data;
    },

    // Yanıt gönder
    async submitResponse(surveyId: string, responseData: Response): Promise<void> {
        await api.post(`/surveys/${surveyId}/responses`, responseData);
    },

    // İşletme anketlerini getir
    async getBusinessSurveys(businessId?: string): Promise<Survey[]> {
        try {
            // Eğer businessId verilmezse, kullanıcının kendi işletmesinin anketlerini getir
            const endpoint = businessId
                ? `/surveys/business/${businessId}`
                : '/business/surveys';

            const response = await api.get(endpoint);
            return response.data;
        } catch (error) {
            console.error('İşletme anketlerini getirme hatası:', error);
            throw error;
        }
    },

    // Anket oluştur
    async createSurvey(data: CreateSurveyData): Promise<Survey> {
        // Deneyeceğimiz endpoint listesi
        const endpoints = [
            '/surveys',
            '/surveys/',
            '/business/surveys'
        ];

        let lastError = null;

        // Her endpointi sırayla dene
        for (const endpoint of endpoints) {
            try {
                console.log(`📤 Anket oluşturma isteği - Endpoint: ${endpoint}`);

                // Tarihleri kontrol et
                const surveyData = { ...data };

                if (surveyData.startDate instanceof Date) {
                    surveyData.startDate = new Date(surveyData.startDate.toISOString());
                }

                if (surveyData.endDate instanceof Date) {
                    surveyData.endDate = new Date(surveyData.endDate.toISOString());
                }

                // API isteğini gönder
                const response = await api.post(endpoint, surveyData);
                console.log(`✅ Anket başarıyla oluşturuldu (${endpoint})`);

                // Başarılı yanıt varsa döndür
                return response.data.survey || response.data;
            } catch (error: any) {
                lastError = error;
                console.error(`❌ Endpoint ${endpoint} başarısız:`, error.message);

                // Yetkilendirme hatası varsa diğer endpointleri deneme
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    throw error;
                }
            }
        }

        // Tüm denemeler başarısızsa son hatayı fırlat
        throw lastError || new Error('Anket oluşturulamadı');
    },

    // Anket güncelle
    async updateSurvey(id: string, data: Partial<Survey>): Promise<Survey> {
        const response = await api.put(`/surveys/${id}`, data);
        return response.data;
    },

    // Anket sil
    async deleteSurvey(id: string): Promise<void> {
        await api.delete(`/surveys/${id}`);
    },

    // Ankete ait yanıtları getir
    async getSurveyResponses(surveyId: string): Promise<Response[]> {
        const response = await api.get(`/surveys/${surveyId}/responses`);
        return response.data;
    },

    // QR kodları getir
    async getSurveyQRCodes(surveyId: string): Promise<QRCode[]> {
        try {
            const response = await api.get(`/surveys/qr/survey/${surveyId}`);
            return response.data;
        } catch (error) {
            console.error('Anket QR kodlarını getirme hatası:', error);
            throw error;
        }
    },

    // Yeni QR kod oluştur
    async generateQRCode(surveyId: string): Promise<{ url: string, dataUrl: string }> {
        const response = await api.post(`/surveys/qr/${surveyId}`);
        return response.data;
    },

    // İşletmeye ait QR kodlarını getir
    async getBusinessQRCodes(businessId: string): Promise<QRCode[]> {
        const response = await api.get(`/surveys/qr/business/${businessId}`);
        return response.data;
    },

    // QR kod sil
    async deleteQRCode(qrCodeId: string): Promise<void> {
        await api.delete(`/surveys/qr/${qrCodeId}`);
    },

    // QR kod ile anket al
    async getSurveyByQRCode(code: string): Promise<Survey> {
        const response = await api.get(`/surveys/code/${code}`);
        return response.data;
    },

    async getSurveyAnalytics(surveyId: string): Promise<{
        totalResponses: number;
        averageRating: number;
        sentimentAnalysis: {
            positive: number;
            neutral: number;
            negative: number;
        };
        questionStats: {
            [questionId: string]: {
                averageRating?: number;
                optionCounts?: { [option: string]: number };
                textResponses?: string[];
            };
        };
    }> {
        const response = await api.get(`/surveys/${surveyId}/analytics`);
        return response.data;
    },
};

export default surveyService; 