import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole } from '../types/UserRole';

interface User {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    business?: string;
    isActive: boolean;
}

interface AuthContextData {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (user: User) => Promise<void>;
}

interface AuthProviderProps {
    children: ReactNode;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    async function loadStoredAuth() {
        try {
            const storedToken = await AsyncStorage.getItem('token');
            const storedUser = await AsyncStorage.getItem('user');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error('Kimlik bilgileri yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    }

    async function login(newToken: string, newUser: User) {
        try {
            await AsyncStorage.setItem('token', newToken);
            await AsyncStorage.setItem('user', JSON.stringify(newUser));
            setToken(newToken);
            setUser(newUser);
        } catch (error) {
            console.error('Giriş yapılırken hata:', error);
            throw error;
        }
    }

    async function logout() {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            setToken(null);
            setUser(null);
        } catch (error) {
            console.error('Çıkış yapılırken hata:', error);
            throw error;
        }
    }

    async function updateUser(updatedUser: User) {
        try {
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (error) {
            console.error('Kullanıcı güncellenirken hata:', error);
            throw error;
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                login,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextData {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
} 