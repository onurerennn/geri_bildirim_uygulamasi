import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/User';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

interface AuthContextData {
    isAuthenticated: boolean;
    user: User | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    checkAndUpdateToken: () => void;
    getAuthHeader: () => { Authorization?: string };
    setUser: (user: User) => void;
    updateProfile: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextData>({
    isAuthenticated: false,
    user: null,
    login: () => { },
    logout: () => { },
    checkAndUpdateToken: () => { },
    getAuthHeader: () => ({}),
    setUser: () => { },
    updateProfile: async () => false
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

    const updateProfile = async () => {
        try {
            // Mevcut token kontrolü
            const token = localStorage.getItem('token');
            if (!token) return false;

            // Sonsuz döngüyü engellemek için zaman damgası kontrolü
            const lastUpdateTime = parseInt(localStorage.getItem('lastProfileUpdate') || '0', 10);
            const currentTime = Date.now();

            // Son güncellemeden bu yana 2 saniyeden az geçmişse, güncellemeyi atla
            if (currentTime - lastUpdateTime < 2000) {
                console.log("🛑 Çok sık profil güncellemesi isteği - atlanıyor");
                return false;
            }

            // Zaman damgasını şimdi güncelle
            localStorage.setItem('lastProfileUpdate', currentTime.toString());

            console.log("🔄 Kullanıcı profili güncelleniyor...");

            // Profil bilgilerini API'den al
            const response = await apiService.get('/users/profile');
            console.log("API yanıtı:", response.data);

            if (response.data && response.data.success && response.data.data && response.data.data.user) {
                const userData = response.data.data.user;
                console.log("Alınan kullanıcı verileri:", userData);

                // Mevcut localStorage verisini al
                const currentUserStr = localStorage.getItem('user');
                let currentUser = null;

                if (currentUserStr) {
                    try {
                        currentUser = JSON.parse(currentUserStr);
                    } catch (e) {
                        console.error('Mevcut kullanıcı verisi parse edilemedi:', e);
                    }
                }

                // Orijinal rolü sakla
                const originalRole = currentUser?.role;
                const originalBusiness = currentUser?.business;

                console.log("Mevcut rol ve işletme:", {
                    originalRole,
                    originalBusiness,
                    newRole: userData.role
                });

                // Kullanıcı nesnesini güncelle, points alanını özellikle belirt, rolü koru
                const updatedUser = {
                    ...(currentUser || {}), // Mevcut verileri koru
                    ...userData,
                    // Puanları belirgin şekilde güncelle
                    points: userData.points || userData.totalApprovedPoints || 0,
                    // Oturum kontrolü için gerekli alanları koru
                    isActive: userData.isActive !== false,
                    // Orijinal rolü ve işletme bilgisini koru
                    role: originalRole || userData.role || 'CUSTOMER',
                    business: originalBusiness || userData.business
                };

                // Puanları kontrol et ve logla
                if (userData.points !== undefined || userData.totalApprovedPoints !== undefined) {
                    console.log("Kullanıcı puanları güncellendi:", updatedUser.points);
                }

                setUser(updatedUser);

                // LocalStorage'ı güncelle
                localStorage.setItem('user', JSON.stringify(updatedUser));

                console.log("✅ Kullanıcı profili güncellendi:", {
                    name: updatedUser.name,
                    role: updatedUser.role, // Değişim olmadığını doğrula
                    business: updatedUser.business
                });
                return true;
            }

            console.warn("Profil verileri alınamadı veya eksik veri");
            return false;
        } catch (error) {
            console.error("❌ Profil güncelleme hatası:", error);
            return false;
        }
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
            setUser: updateUser,
            updateProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext; 