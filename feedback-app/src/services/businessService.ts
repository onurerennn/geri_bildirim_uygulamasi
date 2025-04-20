import axios from 'axios';
import { API_URL } from '../config';

export interface Business {
    _id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    logo?: string;
    isApproved: boolean;
    isActive: boolean;
    approvedBy?: {
        _id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateBusinessData {
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    logo?: string;
}

export interface UpdateBusinessData extends Partial<CreateBusinessData> {
    isActive?: boolean;
}

const businessService = {
    // İşletmeleri getir
    getBusinesses: async (): Promise<Business[]> => {
        const response = await axios.get(`${API_URL}/businesses`);
        return response.data;
    },

    // İşletme detayını getir
    getBusiness: async (id: string): Promise<Business> => {
        const response = await axios.get(`${API_URL}/businesses/${id}`);
        return response.data;
    },

    // Yeni işletme oluştur
    createBusiness: async (data: CreateBusinessData): Promise<Business> => {
        const response = await axios.post(`${API_URL}/businesses`, data);
        return response.data.business;
    },

    // İşletme güncelle
    updateBusiness: async (id: string, data: UpdateBusinessData): Promise<Business> => {
        const response = await axios.put(`${API_URL}/businesses/${id}`, data);
        return response.data.business;
    },

    // İşletme sil
    deleteBusiness: async (id: string): Promise<void> => {
        await axios.delete(`${API_URL}/businesses/${id}`);
    },

    // İşletme onayla
    approveBusiness: async (id: string): Promise<Business> => {
        const response = await axios.post(`${API_URL}/businesses/${id}/approve`);
        return response.data.business;
    },
};

export default businessService; 