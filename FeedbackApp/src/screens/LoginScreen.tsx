import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

interface LoginScreenProps {
    navigation: any;
    route?: {
        params?: {
            email?: string;
        }
    };
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
    // Kayıt ekranından gelen e-posta parametresini al
    const emailFromRegister = route?.params?.email || '';

    const [email, setEmail] = useState(emailFromRegister);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [apiStatus, setApiStatus] = useState('Kontrol ediliyor...');
    const [showDebugInfo, setShowDebugInfo] = useState(false);

    // Auth context'ten login fonksiyonunu al
    const auth = useContext(AuthContext);

    // Form parametrelerinin otomatik doldurulması için
    useEffect(() => {
        if (emailFromRegister) {
            console.log('Kayıt ekranından gelen e-posta:', emailFromRegister);
            setEmail(emailFromRegister);
        }
    }, [emailFromRegister]);

    // Uygulama başladığında API bağlantısını kontrol et
    useEffect(() => {
        checkApiConnection();
    }, []);

    // API sunucusuna bağlantıyı kontrol et
    const checkApiConnection = async () => {
        try {
            setApiStatus('Kontrol ediliyor...');
            const apiUrl = api.getApiUrl();
            const result = await api.ping();

            if (result.success) {
                setApiStatus(`Bağlantı başarılı: ${apiUrl}`);
            } else {
                setApiStatus(`Bağlantı hatası: ${apiUrl}`);
            }
        } catch (error) {
            setApiStatus(`Hata: ${api.getApiUrl()} - ${error}`);
        }
    };

    const handleLogin = async () => {
        // Boş alan kontrolü
        if (!email || !password) {
            setErrorMessage('Lütfen tüm alanları doldurun');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            // Email adresini kontrol et ve küçük harfe çevirerek gönderelim
            const normalizedEmail = email ? email.toLowerCase().trim() : '';
            if (!normalizedEmail) {
                setErrorMessage('Geçerli bir e-posta adresi giriniz.');
                setIsLoading(false);
                return;
            }

            const result = await api.login(normalizedEmail, password);
            console.log('Giriş sonucu:', result);

            if (result.success && result.token && result.data) {
                console.log('Giriş başarılı! Kullanıcı:', result.data);
                console.log('Kullanıcı rolü:', result.data.role);

                // Auth context'i güncelle
                await auth.login(result.token, result.data.role);

                // Kullanıcı rolüne göre yönlendirme
                switch (result.data.role) {
                    case 'SUPER_ADMIN':
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'AdminTabs' }],
                        });
                        break;
                    case 'BUSINESS_ADMIN':
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'BusinessAdminTabs' }],
                        });
                        break;
                    case 'CUSTOMER':
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'CustomerTabs' }],
                        });
                        break;
                    default:
                        console.warn('Bilinmeyen kullanıcı rolü:', result.data.role);
                        // Varsayılan olarak müşteri tab'ına yönlendir
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'CustomerTabs' }],
                        });
                }
            } else {
                // Giriş başarısız
                console.log('Giriş başarısız:', result.error);
                setErrorMessage(result.error || 'Giriş yapılamadı. Kullanıcı adı veya şifre hatalı.');
            }
        } catch (error: any) {
            console.error('Login hatası:', error);
            setErrorMessage(error.message || 'Bağlantı hatası. Lütfen tekrar deneyin.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>Feedback App</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.title}>Hoş Geldiniz</Text>
                    <Text style={styles.subtitle}>Devam etmek için giriş yapın</Text>

                    {/* API Durum Bilgisi */}
                    <View style={styles.apiStatusContainer}>
                        <Text style={styles.apiStatusLabel}>API Durumu:</Text>
                        <Text style={styles.apiStatusText}>{apiStatus}</Text>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={checkApiConnection}
                        >
                            <Text style={styles.refreshButtonText}>Yenile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.debugButton}
                            onPress={() => setShowDebugInfo(!showDebugInfo)}
                        >
                            <Text style={styles.debugButtonText}>{showDebugInfo ? 'Gizle' : 'Debug'}</Text>
                        </TouchableOpacity>
                    </View>

                    {showDebugInfo && (
                        <View style={styles.debugContainer}>
                            <Text style={styles.debugTitle}>Debug Bilgisi</Text>
                            <Text style={styles.debugText}>API URL: {api.getApiUrl()}</Text>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.testButton}
                                    onPress={async () => {
                                        try {
                                            const result = await api.testConnection();
                                            Alert.alert('API Test Sonucu',
                                                `Test Sonucu: ${result.success ? 'Başarılı' : 'Başarısız'}\n` +
                                                `URL: ${result.url || 'Yok'}\n` +
                                                `Mesaj: ${result.message || 'Yok'}`
                                            );
                                        } catch (error: any) {
                                            Alert.alert('Test Hatası', error.message);
                                        }
                                    }}
                                >
                                    <Text style={styles.testButtonText}>API Test Et</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.testButton, { backgroundColor: '#e74c3c' }]}
                                    onPress={() => {
                                        Alert.alert(
                                            'Doğrudan Giriş Yap',
                                            'Test amaçlı doğrudan giriş yapmak ister misiniz?',
                                            [
                                                {
                                                    text: 'SUPER_ADMIN',
                                                    onPress: () => {
                                                        setEmail('onurerenejder36@gmail.com');
                                                        setPassword('ejder3636');
                                                        setTimeout(() => handleLogin(), 500);
                                                    }
                                                },
                                                {
                                                    text: 'İptal',
                                                    style: 'cancel'
                                                }
                                            ]
                                        );
                                    }}
                                >
                                    <Text style={styles.testButtonText}>Test Girişi</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {errorMessage ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>E-posta</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="E-posta adresinizi girin"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Şifre</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Şifrenizi girin"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Giriş Yap</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>Hesabınız yok mu? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.registerLink}>Kayıt Ol</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#3498db',
    },
    formContainer: {
        width: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#777',
        marginBottom: 20,
    },
    apiStatusContainer: {
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 5,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    apiStatusLabel: {
        fontWeight: 'bold',
        marginRight: 5,
    },
    apiStatusText: {
        flex: 1,
        fontSize: 12,
    },
    refreshButton: {
        backgroundColor: '#e7f5ff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
    },
    refreshButtonText: {
        color: '#3498db',
        fontSize: 12,
    },
    debugButton: {
        backgroundColor: '#e7f5ff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
    },
    debugButtonText: {
        color: '#3498db',
        fontSize: 12,
    },
    debugContainer: {
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 5,
        marginBottom: 20,
    },
    debugTitle: {
        fontWeight: 'bold',
        marginBottom: 10,
    },
    debugText: {
        flex: 1,
        fontSize: 12,
    },
    testButton: {
        backgroundColor: '#3498db',
        borderRadius: 5,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    testButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 10,
        borderRadius: 5,
        marginBottom: 20,
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 14,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    loginButton: {
        backgroundColor: '#3498db',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginTop: 10,
        minHeight: 50,
        justifyContent: 'center',
    },
    loginButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    registerText: {
        color: '#333',
        fontSize: 16,
    },
    registerLink: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});

export default LoginScreen; 