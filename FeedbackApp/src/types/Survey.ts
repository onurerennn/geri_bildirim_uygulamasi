export interface Survey {
    _id: string;
    title: string;
    description: string;
    questions: Question[];
    business: string;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Question {
    _id: string;
    text: string;
    type: 'rating' | 'text' | 'multiple_choice';
    options?: string[];
    required: boolean;
}

export interface SurveyResponse {
    surveyId: string;
    answers: Answer[];
    customer?: string;
    createdAt?: string;
    code?: string;
}

export interface Answer {
    questionId: string;
    value: string | number;
} 