import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { User } from '../types';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData extends LoginCredentials {
    name: string;
    role: 'business_admin' | 'customer';
}

const userService = {
    async login(credentials: LoginCredentials): Promise<{ token: string; user: User }> {
        const response = await api.post('/auth/login', credentials);
        await AsyncStorage.setItem('token', response.data.token);
        return response.data;
    },

    async register(data: RegisterData): Promise<{ token: string; user: User }> {
        const response = await api.post('/auth/register', data);
        await AsyncStorage.setItem('token', response.data.token);
        return response.data;
    },

    async getCurrentUser(): Promise<User> {
        const response = await api.get('/users/me');
        return response.data;
    },

    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await api.put('/users/me', data);
        return response.data;
    },

    async logout() {
        await AsyncStorage.removeItem('token');
        // Navigation will be handled by the auth context
    },
};

export default userService; 