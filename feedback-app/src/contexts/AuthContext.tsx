import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/User';

interface AuthContextData {
    isAuthenticated: boolean;
    user: User | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    checkAndUpdateToken: () => void;
    getAuthHeader: () => { Authorization?: string };
}

const AuthContext = createContext<AuthContextData>({
    isAuthenticated: false,
    user: null,
    login: () => { },
    logout: () => { },
    checkAndUpdateToken: () => { },
    getAuthHeader: () => ({})
});

export const useAuth = () => useContext(AuthContext);

// LocalStorage güvenli erişim yardımcı fonksiyonları
const safeGetItem = (key: string): string | null => {
    try {
        const item = localStorage.getItem(key);
        if (item === 'undefined' || item === 'null') {
            console.warn(`Invalid value in localStorage for key '${key}': ${item}`);
            return null;
        }
        return item;
    } catch (error) {
        console.error(`Error reading from localStorage key '${key}':`, error);
        return null;
    }
};

const safeSetItem = (key: string, value: string): void => {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.error(`Error writing to localStorage key '${key}':`, error);
    }
};

const safeRemoveItem = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error removing localStorage key '${key}':`, error);
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Debug fonksiyonu
    const debugLocalStorage = () => {
        console.log('--- LocalStorage Debug ---');
        try {
            const token = localStorage.getItem('token');
            console.log('Token:', token ? `${token.substring(0, 20)}...` : 'YOK');

            const userStr = localStorage.getItem('user');
            console.log('User string:', userStr);

            if (userStr) {
                try {
                    const userData = JSON.parse(userStr);
                    console.log('Parsed user data:', {
                        _id: userData._id,
                        name: userData.name,
                        role: userData.role,
                        business: userData.business || 'YOK'
                    });
                } catch (e) {
                    console.error('User JSON parse hatası:', e);
                }
            }
        } catch (e) {
            console.error('LocalStorage erişim hatası:', e);
        }
        console.log('------------------------');
    };

    // Auth durumunu güncelle
    const checkAndUpdateToken = () => {
        try {
            const token = safeGetItem('token');
            const userData = safeGetItem('user');

            console.log('Auth durumu kontrol ediliyor:', {
                tokenExists: !!token,
                userDataExists: !!userData
            });

            // Debug
            debugLocalStorage();

            if (!token || !userData) {
                // Token veya kullanıcı verisi yoksa, kimlik doğrulamayı sıfırla
                safeRemoveItem('token');
                safeRemoveItem('user');
                setIsAuthenticated(false);
                setUser(null);
                console.warn('Auth bilgileri eksik veya geçersiz, kullanıcı çıkış yaptırıldı');
                return false;
            }

            try {
                const parsedUser = JSON.parse(userData);
                console.log('Mevcut kullanıcı:', {
                    id: parsedUser?._id,
                    email: parsedUser?.email,
                    role: parsedUser?.role,
                    business: parsedUser?.business || "YOK"
                });

                if (!parsedUser || !parsedUser._id) {
                    throw new Error('Geçersiz kullanıcı verisi');
                }

                // Business kontrolü (BUSINESS_ADMIN rolü için)
                if (parsedUser.role === 'BUSINESS_ADMIN' && !parsedUser.business) {
                    console.warn('BUSINESS_ADMIN rolü olan kullanıcının işletme bilgisi yok:', parsedUser._id);
                    
                    // Not: Bu kullanıcının rolüne göre farklı işlem yapılabilir
                    // Bu bir geliştirme hatası olabilir
                    
                    // Acil çözüm: localStorage'daki eksik business ID'yi manuel güncelleyebiliriz
                    // Bu sadece geliştirme veya acil çözüm için kullanılmalıdır
                    /*
                    const updatedUser = {
                        ...parsedUser,
                        business: "680b5c64cf5e6715deff1e0a" // Gerçek bir business ID ekleyin
                    };
                    safeSetItem('user', JSON.stringify(updatedUser));
                    parsedUser = updatedUser;
                    console.log('İşletme ID manuel olarak eklendi:', updatedUser.business);
                    */
                }

                setIsAuthenticated(true);
                setUser(parsedUser);
                return true;
            } catch (parseError) {
                console.error('Kullanıcı verisi parse edilemedi:', parseError);
                safeRemoveItem('token');
                safeRemoveItem('user');
                setIsAuthenticated(false);
                setUser(null);
                return false;
            }
        } catch (error) {
            console.error('Authentication kontrolü sırasında hata:', error);
            safeRemoveItem('token');
            safeRemoveItem('user');
            setIsAuthenticated(false);
            setUser(null);
            return false;
        }
    };

    // Auth header'ı oluştur
    const getAuthHeader = () => {
        const token = safeGetItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    useEffect(() => {
        checkAndUpdateToken();
        setIsInitialized(true);
    }, []);

    const login = (token: string, userData: User) => {
        console.log('Login bilgileri kaydediliyor...', { tokenLength: token?.length, userData });

        // İşletme bilgisi yoksa ve kullanıcı BUSINESS_ADMIN ise uyarı
        if (userData.role === 'BUSINESS_ADMIN' && !userData.business) {
            console.warn('BUSINESS_ADMIN rolündeki kullanıcının işletme bilgisi yok!');

            // Eğer backend userData içinde business göndermiyorsa, manuel olarak ekleyelim
            // Bu, geçici bir çözüm olarak eklenmiştir (hardcoded)
            userData = {
                ...userData,
                business: '64d7e5b8c7b5abb345678901' // Örnek işletme ID'si
            };
            console.log('İşletme ID manuel olarak eklendi:', userData);
        }

        safeSetItem('token', token);
        safeSetItem('user', JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData);
        console.log('Kullanıcı giriş yaptı:', {
            email: userData.email,
            role: userData.role,
            business: userData.business || 'İşletme bilgisi yok'
        });
    };

    const logout = () => {
        safeRemoveItem('token');
        safeRemoveItem('user');
        setIsAuthenticated(false);
        setUser(null);
        console.log('Kullanıcı çıkış yaptı');
    };

    // İlk yükleme tamamlanana kadar bir yükleme ekranı gösterebiliriz
    if (!isInitialized) {
        return <div>Yükleniyor...</div>;
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, checkAndUpdateToken, getAuthHeader }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext; 