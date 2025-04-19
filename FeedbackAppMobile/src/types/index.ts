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
    id: string;
    businessId: string;
    title: string;
    questions: Question[];
    startDate: Date;
    endDate: Date;
    status: 'active' | 'inactive';
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
    userId: string;
    answers: Answer[];
    sentiment?: {
        score: number;
        magnitude: number;
        labels: string[];
    };
    createdAt: Date;
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