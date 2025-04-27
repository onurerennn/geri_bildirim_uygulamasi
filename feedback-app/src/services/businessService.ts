import api from './api';
import { Business } from '../types/Business';

// Local storage helper
const getAuthToken = (): string | null => {
    try {
        return localStorage.getItem('token');
    } catch (e) {
        console.error('Token okuma hatası:', e);
        return null;
    }
};

export interface CreateBusinessData {
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    password: string;
}

export interface UpdateBusinessData extends Partial<CreateBusinessData> {
    isActive?: boolean;
}

export interface CreateBusinessAdminData {
    name: string;
    email: string;
    password: string;
}

export interface BusinessListResponse {
    success: boolean;
    count: number;
    businesses: Business[];
}

// Type guard function
export function isBusinessListResponse(value: any): value is BusinessListResponse {
    return (
        value &&
        typeof value === 'object' &&
        'success' in value &&
        'count' in value &&
        'businesses' in value &&
        Array.isArray(value.businesses)
    );
}

export const businessService = {
    // İşletmeleri getir
    getBusinesses: async (): Promise<Business[] | BusinessListResponse> => {
        try {
            console.log('İşletmeler getirme isteği gönderiliyor...');

            // Token kontrolü
            const token = getAuthToken();
            console.log('Authentication token durumu:', token ? 'Var' : 'Yok');

            if (!token) {
                console.error('Token bulunamadı, kullanıcı yetkilendirmesi gerekli');
                throw new Error('Yetkilendirme hatası: Lütfen tekrar giriş yapın');
            }

            // İsteği gönder
            const response = await api.get('/api/businesses', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log('İşletmeler yanıtı alındı:', response.status, response.statusText);
            console.log('İşletme verileri:', response.data);

            if (!response.data) {
                console.error('Geçersiz işletme verileri:', response.data);
                return [];
            }

            // Check response structure and return appropriate type
            const data = response.data;
            if (Array.isArray(data)) {
                return data as Business[];
            } else if (isBusinessListResponse(data)) {
                return data;
            } else {
                console.error('Beklenmeyen veri yapısı:', data);
                return [];
            }
        } catch (error: any) {
            console.error('İşletmeler getirilirken hata:', error);
            console.error('Hata detayları:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            // Yetki hatası kontrolü
            if (error.response?.status === 401) {
                console.error('Yetkilendirme hatası, token geçersiz veya eksik.');
                // localStorage'dan token ve user bilgilerini temizle
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }

            throw error;
        }
    },

    // İşletme detayını getir
    getBusiness: async (id: string): Promise<Business> => {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('Yetkilendirme hatası: Lütfen tekrar giriş yapın');
            }

            console.log(`İşletme detayı getiriliyor (ID: ${id})...`);
            const response = await api.get(`/api/businesses/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('İşletme detayı başarıyla getirildi:', response.data);
            return response.data;
        } catch (error) {
            console.error('İşletme detayı getirilirken hata:', error);
            throw error;
        }
    },

    // Yeni işletme oluştur
    createBusiness: async (data: CreateBusinessData): Promise<Business> => {
        try {
            console.log('İşletme oluşturma isteği gönderiliyor:', {
                ...data,
                password: data.password ? '***' : undefined
            });

            const token = getAuthToken();
            if (!token) {
                throw new Error('Yetkilendirme hatası: Lütfen tekrar giriş yapın');
            }

            // API isteği gönder
            const response = await api.post('/api/businesses', data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('İşletme oluşturma yanıtı:', response.data);

            if (!response.data || !response.data.business) {
                console.error('Sunucudan geçersiz yanıt alındı:', response.data);
                throw new Error('Sunucudan geçersiz yanıt alındı');
            }

            return response.data.business;
        } catch (error: any) {
            console.error('İşletme oluşturma hatası:', error);
            console.error('Hata detayları:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }

            throw new Error(error.message || 'İşletme oluşturulurken bir hata oluştu');
        }
    },

    // İşletme güncelle
    updateBusiness: async (id: string, data: UpdateBusinessData): Promise<Business> => {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('Yetkilendirme hatası: Lütfen tekrar giriş yapın');
            }

            console.log(`İşletme güncelleniyor (ID: ${id}):`, data);
            const response = await api.put(`/api/businesses/${id}`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('İşletme güncelleme yanıtı:', response.data);
            return response.data.business;
        } catch (error) {
            console.error('İşletme güncellenirken hata:', error);
            throw error;
        }
    },

    // İşletme sil
    deleteBusiness: async (id: string): Promise<void> => {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('Yetkilendirme hatası: Lütfen tekrar giriş yapın');
            }

            console.log(`İşletme siliniyor (ID: ${id})...`);
            await api.delete(`/api/businesses/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('İşletme başarıyla silindi');
        } catch (error) {
            console.error('İşletme silinirken hata:', error);
            throw error;
        }
    },

    // İşletme onayla
    approveBusiness: async (id: string): Promise<Business> => {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('Yetkilendirme hatası: Lütfen tekrar giriş yapın');
            }

            console.log(`İşletme onaylanıyor (ID: ${id})...`);
            const response = await api.post(`/api/businesses/${id}/approve`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('İşletme onaylama yanıtı:', response.data);
            return response.data;
        } catch (error) {
            console.error('İşletme onaylanırken hata:', error);
            throw error;
        }
    },

    // İşletme admin ekle
    addBusinessAdmin: async (businessId: string, data: CreateBusinessAdminData): Promise<any> => {
        try {
            console.log(`İşletme admin ekleniyor (Business ID: ${businessId})...`, {
                ...data,
                password: data.password ? '***' : undefined
            });

            const token = getAuthToken();
            if (!token) {
                throw new Error('Yetkilendirme hatası: Lütfen tekrar giriş yapın');
            }

            const response = await api.post(`/api/businesses/${businessId}/admin`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('İşletme admin ekleme yanıtı:', response.data);

            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.admin;
        } catch (error: any) {
            console.error('İşletme admin eklenirken hata:', error);
            console.error('Hata detayları:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }

            throw new Error(
                error.message ||
                'İşletme admin eklenirken bir hata oluştu'
            );
        }
    },
}; 