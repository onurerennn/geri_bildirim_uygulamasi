import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

interface AuthProviderProps {
    children: ReactNode;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            localStorage.removeItem('user'); // Hatalı veriyi temizle
            return null;
        }
    });

    const [token, setToken] = useState<string | null>(() => {
        try {
            return localStorage.getItem('token') || null;
        } catch (error) {
            console.error('Error reading token from localStorage:', error);
            return null;
        }
    });

    const [loading, setLoading] = useState(false);

    function login(newToken: string, newUser: User) {
        try {
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(newUser));
            setToken(newToken);
            setUser(newUser);
        } catch (error) {
            console.error('Error saving auth data to localStorage:', error);
        }
    }

    function logout() {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
        } catch (error) {
            console.error('Error removing auth data from localStorage:', error);
        }
    }

    function updateUser(updatedUser: User) {
        try {
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (error) {
            console.error('Error updating user in localStorage:', error);
        }
    }

    // Uygulama başladığında geçersiz verileri temizle
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                JSON.parse(storedUser); // Geçerli JSON mu diye kontrol et
            }
        } catch (error) {
            console.error('Invalid user data in localStorage:', error);
            localStorage.removeItem('user');
            setUser(null);
        }
    }, []);

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