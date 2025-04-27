export type UserRole = 'super_admin' | 'business_admin' | 'customer';

export interface User {
    id: string;
    email: string;
    password: string;
    role: UserRole;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Business {
    id: string;
    name: string;
    adminId: string;
    address: string;
    phone: string;
    qrCodes: string[];
    createdAt: Date;
    updatedAt: Date;
}

export type QuestionType = 'multiple_choice' | 'rating' | 'text';

export interface Question {
    id: string;
    type: QuestionType;
    text: string;
    options?: string[];
    required: boolean;
}

export interface Survey {
    _id: string;
    businessId: string;
    title: string;
    description?: string;
    questions: Question[];
    startDate: Date;
    endDate: Date;
    status: 'active' | 'inactive' | 'draft' | 'completed';
    isPublic: boolean;
    qrCodes?: string[];
    responseCount?: number;
    createdBy?: string;
    updatedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Answer {
    questionId: string;
    value: string | number;
}

export interface Response {
    id: string;
    surveyId: string;
    userId?: string;
    answers: Answer[];
    sentiment?: {
        score: number;
        magnitude: number;
        labels: string[];
    };
    deviceInfo?: {
        platform: string;
        model: string;
        version: string;
    };
    location?: {
        latitude: number;
        longitude: number;
    };
    createdAt: Date;
}

export interface QRCode {
    _id: string;
    code: string;
    surveyId: string;
    businessId: string;
    url: string;
    surveyTitle?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export type RewardType = 'survey_completion' | 'referral';

export interface Reward {
    id: string;
    userId: string;
    businessId: string;
    points: number;
    type: RewardType;
    createdAt: Date;
} 