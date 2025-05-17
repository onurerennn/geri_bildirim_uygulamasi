import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'CUSTOMER';

interface UserInfo {
    name: string;
    email: string;
}

export interface AuthContextType {
    isAuthenticated: boolean;
    userRole: UserRole | null;
    token: string | null;
    userInfo: UserInfo | null;
    login: (token: string, role: UserRole, userInfo: UserInfo) => Promise<void>;
    logout: () => Promise<void>;
    updateUserInfo: (info: UserInfo) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    userRole: null,
    token: null,
    userInfo: null,
    login: async () => { },
    logout: async () => { },
    updateUserInfo: async () => { },
});

// useAuthContext hook'u
export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

    useEffect(() => {
        // Uygulama başladığında token ve rol bilgisini kontrol et
        loadAuthState();
    }, []);

    const loadAuthState = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('userToken');
            const storedRole = await AsyncStorage.getItem('userRole') as UserRole;
            const storedUserInfo = await AsyncStorage.getItem('userInfo');

            if (storedToken && storedRole) {
                setToken(storedToken);
                setUserRole(storedRole);
                setIsAuthenticated(true);

                if (storedUserInfo) {
                    setUserInfo(JSON.parse(storedUserInfo));
                }
            }
        } catch (error) {
            console.error('Auth state yükleme hatası:', error);
        }
    };

    const login = async (newToken: string, role: UserRole, info: UserInfo) => {
        try {
            // Önce token ve rol bilgisini kaydet
            if (newToken) {
                await AsyncStorage.setItem('userToken', newToken);
            }
            if (role) {
                await AsyncStorage.setItem('userRole', role);
            }

            // Kullanıcı bilgilerini kaydet
            if (info) {
                const userInfoString = JSON.stringify(info);
                await AsyncStorage.setItem('userInfo', userInfoString);
            }

            // State'i güncelle
            setToken(newToken);
            setUserRole(role);
            setUserInfo(info);
            setIsAuthenticated(true);

            console.log('Login başarılı:', { role, hasToken: !!newToken, hasInfo: !!info });
        } catch (error) {
            console.error('Login hatası:', error);
            // Hata durumunda storage'ı temizle
            await AsyncStorage.multiRemove(['userToken', 'userRole', 'userInfo']);
            throw new Error('Login işlemi başarısız oldu');
        }
    };

    const updateUserInfo = async (info: UserInfo) => {
        try {
            await AsyncStorage.setItem('userInfo', JSON.stringify(info));
            setUserInfo(info);
        } catch (error) {
            console.error('Kullanıcı bilgisi güncelleme hatası:', error);
            throw new Error('Kullanıcı bilgisi güncellenemedi');
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userRole');
            await AsyncStorage.removeItem('userInfo');

            setToken(null);
            setUserRole(null);
            setUserInfo(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Logout hatası:', error);
            throw new Error('Logout işlemi başarısız oldu');
        }
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                userRole,
                token,
                userInfo,
                login,
                logout,
                updateUserInfo,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}; 