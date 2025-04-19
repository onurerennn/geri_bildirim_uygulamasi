import api from './api';
import { Reward } from '../types';

const rewardService = {
    async getUserRewards(userId: string): Promise<Reward[]> {
        const response = await api.get(`/users/${userId}/rewards`);
        return response.data;
    },

    async getUserPoints(userId: string): Promise<number> {
        const response = await api.get(`/users/${userId}/points`);
        return response.data.points;
    },

    async redeemPoints(userId: string, amount: number): Promise<{
        success: boolean;
        remainingPoints: number;
        message: string;
    }> {
        const response = await api.post(`/users/${userId}/redeem`, { amount });
        return response.data;
    },

    async getBusinessRewardStats(businessId: string): Promise<{
        totalPointsAwarded: number;
        totalRedemptions: number;
        activeUsers: number;
        rewardDistribution: {
            [type: string]: number;
        };
    }> {
        const response = await api.get(`/businesses/${businessId}/reward-stats`);
        return response.data;
    },
};

export default rewardService; 