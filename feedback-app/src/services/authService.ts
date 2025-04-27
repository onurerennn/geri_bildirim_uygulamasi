import api from './api';
import { User } from '../types/User';
import { UserRole } from '../types/UserRole';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData extends LoginCredentials {
    name: string;
    role: UserRole.BUSINESS_ADMIN | UserRole.CUSTOMER;
    businessId?: string;
}

const authService = {
    login: async (credentials: LoginCredentials): Promise<{ token: string; user: User }> => {
        try {
            console.log('Login credentials:', { email: credentials.email, password: '***' });
            console.log('Sending login request to:', `${api.defaults.baseURL}/api/auth/login`);

            const response = await api.post('/api/auth/login', credentials);

            // Tüm yanıtı logla
            console.log('Raw login response:', JSON.stringify(response.data, null, 2));

            // Yanıtı işle - data alanından kullanıcı bilgilerini al
            const userData = response.data.data;
            const token = response.data.token;

            console.log('Processed login data:', {
                user: userData,
                token: token ? 'Present' : 'Missing'
            });

            // Gerekli alanları kontrol et
            if (!token) {
                console.error('Token eksik:', response.data);
                throw new Error('Giriş başarısız: Token eksik');
            }

            if (!userData._id || !userData.email || !userData.role) {
                console.error('Eksik kullanıcı bilgileri:', userData);
                throw new Error('Giriş başarısız: Eksik kullanıcı bilgileri');
            }

            // SuperAdmin girişi için ekstra log
            if (userData.role === UserRole.SUPER_ADMIN) {
                console.log('SuperAdmin girişi başarılı');
            }

            // Token'ı localStorage'a kaydet
            localStorage.setItem('token', token);

            // Verileri birleştir
            return {
                token,
                user: userData as User
            };
        } catch (error: any) {
            console.error('Login error details:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
                config: error.config
            });

            if (error.message.includes('Network Error')) {
                console.error('Network error detected. API server may be down or unreachable');
                // Try to check if server is reachable at all
                try {
                    await fetch('http://localhost:5000');
                } catch (fetchError) {
                    console.error('Server connectivity check also failed');
                }
            }

            throw error;
        }
    },

    register: async (data: RegisterData): Promise<{ token: string; user: User }> => {
        try {
            console.log('Sending registration request:', {
                ...data,
                password: '[HIDDEN]'
            });
            const response = await api.post('/api/auth/register', data);
            console.log('Registration response:', {
                status: response.status,
                data: {
                    ...response.data,
                    token: '[HIDDEN]'
                }
            });
            localStorage.setItem('token', response.data.token);
            return response.data;
        } catch (error: any) {
            console.error('Registration error details:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    },

    getCurrentUser: async (): Promise<User> => {
        try {
            const response = await api.get('/api/auth/me');

            // Kullanıcı rolü kontrolü
            if (response.data && !response.data.role) {
                console.error('API yanıtında rol bilgisi eksik:', response.data);
            }

            return response.data;
        } catch (error: any) {
            console.error('Get current user error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    },

    logout: () => {
        try {
            localStorage.removeItem('token');
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            // Hata olsa bile çıkış yapmaya çalış
            window.location.href = '/login';
        }
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('token');
    },
};

export default authService; 