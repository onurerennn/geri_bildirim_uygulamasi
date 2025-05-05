import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

// AuthContext için tip tanımı
interface AuthContextType {
    user: any;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; user?: any; error?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; autoLogin?: boolean; error?: string }>;
    logout: (onLogoutComplete?: () => void) => Promise<void>;
}

// AuthContext oluşturma
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// useAuthContext hook'u
export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};

// AuthProvider bileşeni props tipi
interface AuthProviderProps {
    children: ReactNode;
}

// AuthProvider bileşeni
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    // useAuth hook'undan kimlik doğrulama verilerini ve fonksiyonlarını al
    const auth = useAuth();

    // Context sağlayıcısını döndür
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}; 