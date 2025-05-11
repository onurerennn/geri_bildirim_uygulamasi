import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/User';
import { useNavigate } from 'react-router-dom';

interface AuthContextData {
    isAuthenticated: boolean;
    user: User | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    checkAndUpdateToken: () => void;
    getAuthHeader: () => { Authorization?: string };
    setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextData>({
    isAuthenticated: false,
    user: null,
    login: () => { },
    logout: () => { },
    checkAndUpdateToken: () => { },
    getAuthHeader: () => ({}),
    setUser: () => { }
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
    const navigate = useNavigate();

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

                // İşletme bilgisini doğrula
                let businessId = null;
                if (parsedUser.business) {
                    if (typeof parsedUser.business === 'string' &&
                        parsedUser.business.trim() !== '' &&
                        parsedUser.business !== 'undefined' &&
                        parsedUser.business !== 'null') {
                        businessId = parsedUser.business.trim();
                    }
                }

                // Business kontrolü (BUSINESS_ADMIN rolü için)
                if (parsedUser.role === 'BUSINESS_ADMIN' && !businessId) {
                    console.warn('BUSINESS_ADMIN rolü olan kullanıcının işletme bilgisi yok:', parsedUser._id);
                    parsedUser.needsBusinessConfig = true;
                } else {
                    parsedUser.needsBusinessConfig = false;
                    // İşletme ID'sini güncelle
                    parsedUser.business = businessId;
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
        console.log('API yanıtından gelen ham kullanıcı verisi:', JSON.stringify(userData));

        // İşletme bilgisini doğrula
        let businessId = null;
        if (userData.business) {
            if (typeof userData.business === 'string') {
                if (userData.business.trim() !== '' &&
                    userData.business !== 'undefined' &&
                    userData.business !== 'null') {
                    businessId = userData.business.trim();
                    console.log('String olarak işletme ID bulundu:', businessId);
                }
            } else if (typeof userData.business === 'object' && userData.business !== null) {
                // TypeScript için daha güvenli tür kontrolü
                const businessObj = userData.business as any;
                if (businessObj._id) {
                    businessId = businessObj._id;
                    console.log('Nesne içinde işletme ID bulundu:', businessId);
                }
            }
        }

        // Güncellenmiş kullanıcı verisi oluştur
        const updatedUserData = {
            ...userData,
            business: businessId
        };

        // İşletme bilgisi yoksa ve kullanıcı BUSINESS_ADMIN ise uyarı
        if (updatedUserData.role === 'BUSINESS_ADMIN' && !businessId) {
            console.warn('BUSINESS_ADMIN rolündeki kullanıcının işletme bilgisi yok!');
            console.log('İşletme ID eksik! Kullanıcı DevTools sayfasını kullanarak işletme seçmeli.');
            updatedUserData.needsBusinessConfig = true;
        } else {
            updatedUserData.needsBusinessConfig = false;
        }

        console.log('Son işlenmiş kullanıcı verileri:', updatedUserData);

        safeSetItem('token', token);
        safeSetItem('user', JSON.stringify(updatedUserData));
        setIsAuthenticated(true);
        setUser(updatedUserData);
        console.log('Kullanıcı giriş yaptı:', {
            email: updatedUserData.email,
            role: updatedUserData.role,
            business: updatedUserData.business || 'İşletme bilgisi yok',
            needsConfig: updatedUserData.needsBusinessConfig
        });

        // Eğer BUSINESS_ADMIN kullanıcısı ve işletme bilgisi yoksa DevTools sayfasına yönlendir
        if (updatedUserData.role === 'BUSINESS_ADMIN' && !updatedUserData.business) {
            setTimeout(() => {
                navigate('/dev-tools');
            }, 500);
        }
    };

    const logout = () => {
        safeRemoveItem('token');
        safeRemoveItem('user');
        setIsAuthenticated(false);
        setUser(null);
        console.log('Kullanıcı çıkış yaptı');
    };

    // setUser fonksiyonu dışarıya açılmalı
    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        // User verilerini localStorage'a kaydet
        safeSetItem('user', JSON.stringify(updatedUser));
        console.log('Kullanıcı bilgileri güncellendi:', {
            id: updatedUser._id,
            email: updatedUser.email,
            role: updatedUser.role,
            business: updatedUser.business || 'YOK'
        });
    };

    // İlk yükleme tamamlanana kadar bir yükleme ekranı gösterebiliriz
    if (!isInitialized) {
        return <div>Yükleniyor...</div>;
    }

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            login,
            logout,
            checkAndUpdateToken,
            getAuthHeader,
            setUser: updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext; 