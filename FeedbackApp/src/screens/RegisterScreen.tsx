import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuthContext } from '../context/AuthContext';

interface RegisterScreenProps {
    navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Auth context'ten register fonksiyonunu al
    const { register } = useAuthContext();

    const handleRegister = async () => {
        // Form validasyonu
        if (!name || !email || !password || !confirmPassword) {
            setErrorMessage('Lütfen tüm alanları doldurun');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Şifreler eşleşmiyor');
            return;
        }

        // Basit email formatı kontrolü
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setErrorMessage('Geçerli bir e-posta adresi girin');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            // E-postayı küçük harfe çevirelim
            const normalizedEmail = email.toLowerCase().trim();
            console.log('Kayıt bilgileri:', { name, email: normalizedEmail, password });

            // API üzerinden kayıt işlemi
            const result = await register(name, normalizedEmail, password);

            if (result.success) {
                console.log('Kayıt başarılı. Sonuç:', result);

                if (result.autoLogin) {
                    // Otomatik giriş gerçekleşti, ana sayfaya yönlendir
                    console.log('Otomatik giriş başarılı, ana sayfaya yönlendiriliyor...');
                    // Boş alert göster
                    Alert.alert(
                        'Kayıt Başarılı',
                        'Hesabınız oluşturuldu ve otomatik giriş yapıldı.',
                        [{ text: 'Tamam' }]
                    );
                    // Ana sayfaya yönlendirme burada yapılacak (AuthContext tarafından otomatik)
                } else {
                    // Otomatik giriş yapılamadı, giriş bilgilerini göster
                    Alert.alert(
                        'Kayıt Başarılı',
                        `Lütfen şu bilgilerle giriş yapın:\nE-posta: ${normalizedEmail}\nŞifre: ${password}\n\nBu bilgileri kaydettiğinizden emin olun.`,
                        [
                            {
                                text: 'Giriş Yap',
                                onPress: () => {
                                    // Giriş ekranına git ve e-posta alanını doldur
                                    navigation.navigate('Login', { email: normalizedEmail });
                                }
                            }
                        ]
                    );
                }
            } else {
                // Kayıt başarısız olursa hata mesajı göster
                console.log('Kayıt başarısız. Hata:', result.error);
                setErrorMessage(result.error || 'Kayıt işlemi başarısız oldu');
            }
        } catch (error) {
            console.error('Kayıt hatası (detaylı):', error);
            setErrorMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
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
                <View style={styles.headerContainer}>
                    <Text style={styles.headerText}>Feedback App</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.title}>Hesap Oluştur</Text>
                    <Text style={styles.subtitle}>Başlamak için kaydolun</Text>

                    {errorMessage ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Ad Soyad</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Adınızı ve soyadınızı girin"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

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

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Şifre Tekrar</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Şifrenizi tekrar girin"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.registerButtonText}>Kayıt Ol</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginLink}>Giriş Yap</Text>
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
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    headerText: {
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
        marginBottom: 30,
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
    registerButton: {
        backgroundColor: '#3498db',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginTop: 10,
        minHeight: 50,
        justifyContent: 'center',
    },
    registerButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    loginText: {
        color: '#333',
        fontSize: 16,
    },
    loginLink: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default RegisterScreen; 