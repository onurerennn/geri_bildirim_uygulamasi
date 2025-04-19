import api from './api';
import { Survey, Response } from '../types';

export interface CreateSurveyData {
    title: string;
    questions: {
        type: 'multiple_choice' | 'rating' | 'text';
        text: string;
        options?: string[];
        required: boolean;
    }[];
    startDate: Date;
    endDate: Date;
}

const surveyService = {
    async createSurvey(data: CreateSurveyData): Promise<Survey> {
        const response = await api.post('/surveys', data);
        return response.data;
    },

    async getSurvey(id: string): Promise<Survey> {
        const response = await api.get(`/surveys/${id}`);
        return response.data;
    },

    async getBusinessSurveys(businessId: string): Promise<Survey[]> {
        const response = await api.get(`/businesses/${businessId}/surveys`);
        return response.data;
    },

    async submitResponse(surveyId: string, answers: Response['answers']): Promise<Response> {
        const response = await api.post(`/surveys/${surveyId}/responses`, { answers });
        return response.data;
    },

    async getSurveyResponses(surveyId: string): Promise<Response[]> {
        const response = await api.get(`/surveys/${surveyId}/responses`);
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