import axios from '../utils/api';

interface RewardPoints {
    surveyId: string;
    points: number;
}

interface Reward {
    _id: string;
    businessId: string;
    title: string;
    description: string;
    pointsCost: number;
    isActive: boolean;
}

export const rewardService = {
    // İşletme için puan tanımlama
    setSurveyPoints: async (surveyId: string, points: number) => {
        const response = await axios.post(`/api/rewards/survey-points`, { surveyId, points });
        return response.data;
    },

    // Anket yanıtı için puan verme
    awardPointsForResponse: async (responseId: string) => {
        const response = await axios.post(`/api/rewards/award-points/${responseId}`);
        return response.data;
    },

    // Müşteri puan bakiyesi sorgulama
    getCustomerPoints: async (businessId: string) => {
        const response = await axios.get(`/api/rewards/points/${businessId}`);
        return response.data;
    },

    // Puan geçmişi
    getPointsHistory: async () => {
        const response = await axios.get(`/api/rewards/points/history`);
        return response.data;
    },

    // Ödül oluşturma
    createReward: async (reward: Omit<Reward, '_id'>) => {
        const response = await axios.post(`/api/rewards`, reward);
        return response.data;
    },

    // İşletmenin ödüllerini listeleme
    getBusinessRewards: async (businessId: string) => {
        const response = await axios.get(`/api/rewards/business/${businessId}`);
        return response.data;
    },

    // Ödül düzenleme
    updateReward: async (rewardId: string, reward: Partial<Reward>) => {
        const response = await axios.put(`/api/rewards/${rewardId}`, reward);
        return response.data;
    },

    // Ödül silme
    deleteReward: async (rewardId: string) => {
        const response = await axios.delete(`/api/rewards/${rewardId}`);
        return response.data;
    }
}; 