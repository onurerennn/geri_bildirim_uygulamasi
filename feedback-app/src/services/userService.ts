import api from './api';

export interface User {
    _id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'CUSTOMER';
    businessId?: string;
    isActive: boolean;
    createdAt: string;
}

export interface CreateUserData {
    name: string;
    email: string;
    password: string;
    role: User['role'];
    businessId?: string;
}

export interface UpdateUserData {
    name?: string;
    email?: string;
    password?: string;
    role?: User['role'];
    businessId?: string;
    isActive?: boolean;
}

const userService = {
    getUsers: async (): Promise<User[]> => {
        const response = await api.get('/users');
        return response.data;
    },

    getUser: async (id: string): Promise<User> => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },

    createUser: async (userData: CreateUserData): Promise<User> => {
        const response = await api.post('/users', userData);
        return response.data;
    },

    updateUser: async (id: string, userData: UpdateUserData): Promise<User> => {
        const response = await api.put(`/users/${id}`, userData);
        return response.data;
    },

    deleteUser: async (id: string): Promise<void> => {
        await api.delete(`/users/${id}`);
    },
};

export default userService; 