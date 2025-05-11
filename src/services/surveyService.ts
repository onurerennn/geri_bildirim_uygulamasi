import axios from '../utils/api';
import { rewardService } from './rewardService';

interface SurveyResponse {
    surveyId: string;
    answers: {
        questionId: string;
        answer: string | string[];
    }[];
}

export const surveyService = {
    // QR kod ile anket getirme
    getSurveyByQRCode: async (qrId: string) => {
        const response = await axios.get(`/api/surveys/qr/${qrId}`);
        return response.data;
    },

    // İşletmenin anketlerini getirme
    getBusinessSurveys: async () => {
        const response = await axios.get('/api/surveys/business');
        return response.data;
    },

    // Anket yanıtlama
    submitSurveyResponse: async (surveyResponse: SurveyResponse) => {
        try {
            // Önce anketi yanıtla
            const response = await axios.post('/api/surveys/respond', surveyResponse);

            // Yanıt başarılı ise puan ver
            if (response.data) {
                await rewardService.awardPointsForResponse(response.data._id);
            }

            return response.data;
        } catch (error) {
            console.error('Anket yanıtlama hatası:', error);
            throw error;
        }
    },

    // İşletmenin anket yanıtlarını getirme
    getSurveyResponses: async (surveyId: string) => {
        const response = await axios.get(`/api/surveys/${surveyId}/responses`);
        return response.data;
    }
}; 