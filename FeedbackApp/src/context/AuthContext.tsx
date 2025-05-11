import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'CUSTOMER';

export interface AuthContextType {
    isAuthenticated: boolean;
    userRole: UserRole | null;
    token: string | null;
    login: (token: string, role: UserRole) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    userRole: null,
    token: null,
    login: async () => { },
    logout: async () => { },
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

    useEffect(() => {
        // Uygulama başladığında token ve rol bilgisini kontrol et
        loadAuthState();
    }, []);

    const loadAuthState = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('userToken');
            const storedRole = await AsyncStorage.getItem('userRole') as UserRole;

            if (storedToken && storedRole) {
                setToken(storedToken);
                setUserRole(storedRole);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Auth state yükleme hatası:', error);
        }
    };

    const login = async (newToken: string, role: UserRole) => {
        try {
            await AsyncStorage.setItem('userToken', newToken);
            await AsyncStorage.setItem('userRole', role);
            setToken(newToken);
            setUserRole(role);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Login hatası:', error);
            throw new Error('Login işlemi başarısız oldu');
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userRole');
            setToken(null);
            setUserRole(null);
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
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}; 