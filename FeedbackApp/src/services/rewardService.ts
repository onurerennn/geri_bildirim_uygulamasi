import AsyncStorage from '@react-native-async-storage/async-storage';

interface RewardPoints {
    points: number;
    surveyId: string;
    responseId: string;
    timestamp: number;
}

export const rewardService = {
    // Default points awarded for completing a survey
    DEFAULT_SURVEY_POINTS: 10,

    // Award points for completing a survey response
    awardPointsForResponse: async (responseId: string, surveyId?: string) => {
        try {
            // Get current points from storage
            const currentPointsStr = await AsyncStorage.getItem('userRewardPoints');
            const currentPoints = currentPointsStr ? parseInt(currentPointsStr, 10) : 0;

            // Award points
            const pointsToAward = rewardService.DEFAULT_SURVEY_POINTS;
            const newPoints = currentPoints + pointsToAward;

            // Save new points total
            await AsyncStorage.setItem('userRewardPoints', newPoints.toString());

            // Save reward history
            const reward: RewardPoints = {
                points: pointsToAward,
                surveyId: surveyId || 'unknown',
                responseId,
                timestamp: Date.now()
            };

            // Get existing history
            const historyStr = await AsyncStorage.getItem('rewardHistory');
            const history: RewardPoints[] = historyStr ? JSON.parse(historyStr) : [];

            // Add new reward to history
            history.push(reward);
            await AsyncStorage.setItem('rewardHistory', JSON.stringify(history));

            return {
                success: true,
                points: newPoints,
                awarded: pointsToAward
            };
        } catch (error: any) {
            console.error('Error awarding points:', error);
            throw new Error('Failed to award points for survey response');
        }
    },

    // Get user's current reward points
    getCurrentPoints: async (): Promise<number> => {
        try {
            const pointsStr = await AsyncStorage.getItem('userRewardPoints');
            return pointsStr ? parseInt(pointsStr, 10) : 0;
        } catch (error) {
            console.error('Error getting current points:', error);
            return 0;
        }
    },

    // Get reward history
    getRewardHistory: async (): Promise<RewardPoints[]> => {
        try {
            const historyStr = await AsyncStorage.getItem('rewardHistory');
            return historyStr ? JSON.parse(historyStr) : [];
        } catch (error) {
            console.error('Error getting reward history:', error);
            return [];
        }
    },

    // Reset reward points and history (for testing or user logout)
    resetRewards: async () => {
        try {
            await AsyncStorage.multiRemove(['userRewardPoints', 'rewardHistory']);
            return true;
        } catch (error) {
            console.error('Error resetting rewards:', error);
            return false;
        }
    }
}; 