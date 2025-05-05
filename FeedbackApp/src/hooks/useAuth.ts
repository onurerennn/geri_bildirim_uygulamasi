import { useState, useEffect } from 'react';
// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// Kullanıcı bilgisi tipi
interface User {
    id: string;
    name: string;
    email: string;
}

// AuthState arayüzü
interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

// Kimlik doğrulama hook'u
export const useAuth = () => {
    // Kullanıcı durumu için state
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        isLoading: true,
        isAuthenticated: false,
    });

    // Uygulama başladığında token kontrolü yap
    useEffect(() => {
        const loadToken = async () => {
            try {
                // AsyncStorage'den token'ı al
                const token = await AsyncStorage.getItem('userToken');
                console.log('Saklanan token:', token ? 'Mevcut' : 'Yok');

                if (token) {
                    try {
                        // Token varsa kullanıcı bilgilerini getir
                        console.log('Token ile profil getiriliyor...');

                        // Hata yönetimi iyileştirilmiş profil getirme
                        let userData = null;
                        let profileError = null;

                        try {
                            // İlk deneme: Normal getUserProfile çağrısı
                            userData = await api.getUserProfile(token);
                            console.log('Kullanıcı profili alındı:', userData);
                        } catch (initialError: any) {
                            console.warn('İlk profil getirme denemesi başarısız:', initialError.message);
                            profileError = initialError;

                            // İkinci deneme: API bağlantısını test et ve tekrar dene
                            try {
                                const connectionTest = await api.testConnection();
                                if (connectionTest.success) {
                                    console.log('API bağlantısı başarılı, profil tekrar deneniyor...');
                                    try {
                                        userData = await api.getUserProfile(token);
                                        console.log('İkinci denemede profil alındı:', userData);
                                        profileError = null; // Hata temizlendi
                                    } catch (retryError) {
                                        console.warn('İkinci profil denemesi de başarısız');
                                    }
                                } else {
                                    console.warn('API bağlantı testi başarısız:', connectionTest.message);
                                }
                            } catch (connectionError) {
                                console.warn('API bağlantı testi hatası:', connectionError);
                            }

                            // Üçüncü deneme: Doğrudan fetch API kullanarak dene
                            if (!userData) {
                                try {
                                    console.log('Alternatif yöntem deneniyor: fetch API...');
                                    const response = await fetch(`${api.getApiUrl()}/api/auth/profile`, {
                                        method: 'GET',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json'
                                        }
                                    });

                                    if (response.ok) {
                                        const data = await response.json();
                                        userData = data.data || data;
                                        console.log('Alternatif yöntemle profil alındı:', userData);
                                        profileError = null; // Hata temizlendi
                                    } else {
                                        console.warn('Alternatif yöntem başarısız:', response.status);
                                    }
                                } catch (fetchError) {
                                    console.warn('Alternatif fetch hatası:', fetchError);
                                }
                            }
                        }

                        // Eğer hala hata varsa ve profil alınamadıysa, hata fırlat
                        if (profileError && !userData) {
                            throw profileError;
                        }

                        // Email alanını güvenli bir şekilde kontrol et
                        if (userData && userData.email) {
                            userData.email = userData.email.toLowerCase();
                        }

                        setState({
                            user: userData,
                            token,
                            isLoading: false,
                            isAuthenticated: true,
                        });
                    } catch (profileError) {
                        console.error('Profil getirme hatası, token geçersiz olabilir:', profileError);
                        // Token geçersiz olabilir, temizleyelim
                        await AsyncStorage.removeItem('userToken');
                        setState({
                            user: null,
                            token: null,
                            isLoading: false,
                            isAuthenticated: false,
                        });
                    }
                } else {
                    setState({
                        user: null,
                        token: null,
                        isLoading: false,
                        isAuthenticated: false,
                    });
                }
            } catch (error) {
                console.error('Token yükleme hatası:', error);
                setState({
                    user: null,
                    token: null,
                    isLoading: false,
                    isAuthenticated: false,
                });
            }
        };

        loadToken();
    }, []);

    // Giriş fonksiyonu
    const login = async (email: string, password: string) => {
        try {
            // Email adresini normalize et (küçük harf) - Güvenli kontrol ekle
            const normalizedEmail = email ? email.toLowerCase().trim() : '';
            if (!normalizedEmail) {
                return {
                    success: false,
                    error: 'E-posta adresi gereklidir'
                };
            }

            console.log('Login başlatılıyor:', { email: normalizedEmail });

            // API'den giriş isteği yap
            const response = await api.login(normalizedEmail, password);
            console.log('API yanıtı:', response);

            // Backend API yanıt biçimine uygun olarak işleme
            // Yanıt { data: {kullanıcı bilgileri}, token: "token_değeri" } şeklinde
            // Ya da { success: true, token: "token_değeri", data: {kullanıcı bilgileri} } şeklinde olabilir

            // Response nesnesi içinde data ve token alanları var mı kontrol et
            let userData;
            let token;

            if (response.token) {
                // Direkt yanıt formatı
                token = response.token;

                if (response.data) {
                    // Veri response.data içindeyse
                    userData = response.data;
                } else if (response.user) {
                    // Veri response.user içindeyse 
                    userData = response.user;
                } else {
                    // Kullanıcı bilgisi token ve success dışındaki alanlarda olabilir
                    const { token: _, success: __, ...rest } = response;
                    userData = Object.keys(rest).length > 0 ? rest : null;
                }
            } else {
                console.error('API yanıtında token bulunamadı:', response);
                return {
                    success: false,
                    error: 'Geçersiz yanıt formatı: Token bulunamadı'
                };
            }

            // Kullanıcı bilgilerini kontrol et
            if (!userData || typeof userData !== 'object') {
                console.error('API yanıtında kullanıcı bilgisi bulunamadı:', response);
                return {
                    success: false,
                    error: 'Kullanıcı bilgileri alınamadı'
                };
            }

            console.log('Token:', token ? 'Alındı' : 'Yok');
            console.log('Kullanıcı:', userData);

            // Email alanını güvenli bir şekilde kontrol et
            if (userData && userData.email) {
                userData.email = userData.email.toLowerCase();
            }

            // Token'ı AsyncStorage'e kaydet
            await AsyncStorage.setItem('userToken', token);
            console.log('Token storage\'a kaydedildi');

            // State'i güncelle
            setState({
                user: userData,
                token,
                isLoading: false,
                isAuthenticated: true,
            });

            return { success: true, user: userData };
        } catch (error: any) {
            console.error('Login hatası:', error.message, error.response?.data);

            let errorMessage = 'Giriş sırasında bir hata oluştu';

            if (error.response) {
                // API'den gelen hata mesajını al
                errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    };

    // Kayıt fonksiyonu
    const register = async (name: string, email: string, password: string) => {
        try {
            // Email adresini normalize et - Güvenli kontrol ekle
            const normalizedEmail = email ? email.toLowerCase().trim() : '';
            if (!normalizedEmail) {
                return {
                    success: false,
                    error: 'E-posta adresi gereklidir'
                };
            }

            console.log('Kayıt başlatılıyor:', { name, email: normalizedEmail });

            // API'den kayıt isteği yap
            const response = await api.register({ name, email: normalizedEmail, password });
            console.log('Kayıt yanıtı:', response);

            // Kayıt başarılı ise otomatik giriş yap
            if (response && response.token) {
                console.log('Kayıt başarılı, otomatik giriş yapılıyor...');

                // Email alanını güvenli bir şekilde kontrol et
                if (response.data && response.data.email) {
                    response.data.email = response.data.email.toLowerCase();
                }

                // Token'ı AsyncStorage'e kaydet
                await AsyncStorage.setItem('userToken', response.token);
                console.log('Token storage\'a kaydedildi');

                // State'i güncelle
                setState({
                    user: response.data,
                    token: response.token,
                    isLoading: false,
                    isAuthenticated: true,
                });

                return {
                    success: true,
                    autoLogin: true,
                    data: response
                };
            }

            // Eğer token yoksa, sadece kayıt başarılı bilgisi döndür
            return {
                success: true,
                data: response
            };
        } catch (error: any) {
            console.error('Kayıt işlemi başarısız (Detaylı):', error);

            // Hata detaylarını analiz et
            let errorMessage = 'Kayıt başarısız. Lütfen bilgilerinizi kontrol ediniz.';

            if (error.response) {
                // Sunucu yanıtı varsa
                console.log('Hata yanıtı:', error.response.data);

                if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.status === 400) {
                    errorMessage = 'Geçersiz kayıt bilgileri.';
                } else if (error.response.status === 409) {
                    errorMessage = 'Bu e-posta adresi zaten kullanılıyor.';
                }
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    };

    // Çıkış fonksiyonu
    const logout = async (onLogoutComplete?: () => void) => {
        try {
            // Token'ı AsyncStorage'den sil
            await AsyncStorage.removeItem('userToken');
            console.log('Token silindi, çıkış yapıldı');

            // State'i sıfırla
            setState({
                user: null,
                token: null,
                isLoading: false,
                isAuthenticated: false,
            });

            // Callback fonksiyonu çağır (varsa)
            if (onLogoutComplete) {
                onLogoutComplete();
            }
        } catch (error) {
            console.error('Çıkış hatası:', error);
        }
    };

    return {
        user: state.user,
        token: state.token,
        isLoading: state.isLoading,
        isAuthenticated: state.isAuthenticated,
        login,
        register,
        logout,
    };
}; 