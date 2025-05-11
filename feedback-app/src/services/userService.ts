import api from './api';
import { User } from '../types/User';
import { UserRole } from '../types/UserRole';

// Add UserListResponse interface
export interface UserListResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
}

// Add getAuthToken function
const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
};

// Add isUserListResponse type guard
const isUserListResponse = (data: any): data is UserListResponse => {
    return data &&
        typeof data === 'object' &&
        Array.isArray(data.users) &&
        typeof data.total === 'number';
};

export interface CreateUserData {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    business?: string;
}

export interface UpdateUserData extends Partial<Omit<CreateUserData, 'password'>> {
    isActive?: boolean;
}

export const userService = {
    getUsers: async (): Promise<User[] | UserListResponse> => {
        try {
            console.log('Tüm kullanıcılar getiriliyor...');

            const token = getAuthToken();
            if (!token) {
                throw new Error('Yetkilendirme hatası: Lütfen tekrar giriş yapın');
            }

            const response = await api.get('/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Kullanıcılar alındı:', response.data);

            // Check response structure and return appropriate type
            const data = response.data;
            if (Array.isArray(data)) {
                return data as User[];
            } else if (isUserListResponse(data)) {
                return data;
            } else {
                console.error('Beklenmeyen veri yapısı:', data);
                return [];
            }
        } catch (error: any) {
            console.error('Kullanıcılar getirilirken hata:', error);

            // Yetki hatası kontrolü
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }

            throw error;
        }
    },

    getUser: async (id: string): Promise<User> => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },

    createUser: async (data: CreateUserData): Promise<User> => {
        const response = await api.post('/users', data);
        return response.data;
    },

    updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
        const response = await api.put(`/users/${id}`, data);
        return response.data;
    },

    deleteUser: async (id: string): Promise<void> => {
        await api.delete(`/users/${id}`);
    }
}; 