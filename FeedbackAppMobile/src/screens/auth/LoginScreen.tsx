import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface LoginScreenProps {
    navigation: any;
}

const LoginScreen = ({ navigation }: LoginScreenProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const theme = useTheme();

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Hata', 'E-posta ve şifre gereklidir');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post('/auth/login', {
                email,
                password
            });

            if (response.data.success) {
                const { token, user } = response.data.data;
                await login(token, user);
            } else {
                Alert.alert('Giriş Başarısız', response.data.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
            }
        } catch (error: any) {
            console.error('Giriş hatası:', error);
            Alert.alert(
                'Giriş Başarısız',
                error.response?.data?.message || 'Giriş yapılamadı. Lütfen internet bağlantınızı kontrol edin.'
            );
        } finally {
            setLoading(false);
        }
    };

    const navigateToRegister = () => {
        navigation.navigate('Register');
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.appName}>Geri Bildirim</Text>
                <Text style={styles.tagline}>İşletmeler ve müşteriler arasında köprü</Text>
            </View>

            <View style={styles.formContainer}>
                <TextInput
                    label="E-posta"
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                    left={<TextInput.Icon icon="email" />}
                />

                <TextInput
                    label="Şifre"
                    value={password}
                    onChangeText={setPassword}
                    mode="outlined"
                    secureTextEntry={!isPasswordVisible}
                    style={styles.input}
                    left={<TextInput.Icon icon="lock" />}
                    right={
                        <TextInput.Icon
                            icon={isPasswordVisible ? 'eye-off' : 'eye'}
                            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        />
                    }
                />

                <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={loading}
                    disabled={loading}
                    style={styles.loginButton}
                >
                    Giriş Yap
                </Button>

                <View style={styles.registerContainer}>
                    <Text>Hesabınız yok mu?</Text>
                    <TouchableOpacity onPress={navigateToRegister}>
                        <Text style={[styles.registerLink, { color: theme.colors.primary }]}>
                            Kaydol
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
                        Şifremi Unuttum
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#fff',
        padding: 20,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 16,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    formContainer: {
        width: '100%',
    },
    input: {
        marginBottom: 16,
    },
    loginButton: {
        marginTop: 8,
        paddingVertical: 8,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    registerLink: {
        fontWeight: 'bold',
        marginLeft: 4,
    },
    forgotPassword: {
        alignItems: 'center',
        marginTop: 16,
    },
    forgotPasswordText: {
        fontSize: 14,
    },
});

export default LoginScreen; 