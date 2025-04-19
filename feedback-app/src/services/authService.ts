import api from './api';
import { User } from './userService';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData extends LoginCredentials {
    name: string;
    role: 'BUSINESS_ADMIN' | 'CUSTOMER';
    businessId?: string;
}

const authService = {
    login: async (credentials: LoginCredentials): Promise<{ token: string; user: User }> => {
        const response = await api.post('/auth/login', credentials);
        localStorage.setItem('token', response.data.token);
        return response.data;
    },

    register: async (data: RegisterData): Promise<{ token: string; user: User }> => {
        const response = await api.post('/auth/register', data);
        localStorage.setItem('token', response.data.token);
        return response.data;
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('token');
    },
};

export default authService; 