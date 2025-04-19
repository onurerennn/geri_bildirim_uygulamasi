import api from './api';

export interface Business {
    _id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    description?: string;
    logo?: string;
    isApproved: boolean;
    isActive: boolean;
    approvedBy?: {
        _id: string;
        name: string;
        email: string;
    };
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBusinessData {
    name: string;
    address: string;
    phone: string;
    email: string;
    description?: string;
    logo?: string;
}

export interface UpdateBusinessData {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    description?: string;
    logo?: string;
    isActive?: boolean;
}

const businessService = {
    getBusinesses: async (): Promise<Business[]> => {
        const response = await api.get('/businesses');
        return response.data;
    },

    getBusiness: async (id: string): Promise<Business> => {
        const response = await api.get(`/businesses/${id}`);
        return response.data;
    },

    createBusiness: async (data: CreateBusinessData): Promise<Business> => {
        const response = await api.post('/businesses', data);
        return response.data;
    },

    updateBusiness: async (id: string, data: UpdateBusinessData): Promise<Business> => {
        const response = await api.put(`/businesses/${id}`, data);
        return response.data;
    },

    deleteBusiness: async (id: string): Promise<void> => {
        await api.delete(`/businesses/${id}`);
    },

    approveBusiness: async (id: string): Promise<Business> => {
        const response = await api.post(`/businesses/${id}/approve`);
        return response.data;
    },
};

export default businessService; 