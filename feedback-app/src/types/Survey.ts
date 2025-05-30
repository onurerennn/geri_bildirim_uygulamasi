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
    survey: string;
    answers: Answer[];
    customer: {
        name: string;
        email?: string;
        _id?: string;
    };
    business?: string | { _id: string; name?: string;[key: string]: any };
}

export interface Answer {
    question: string;
    questionId?: string;
    value: string | number | boolean;
} 