import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Title } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import api from "../../services/api";
import { AuthStackNavigationProp } from '../../types/navigation';

const RegisterScreen = () => {
    const navigation = useNavigation<AuthStackNavigationProp>();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secure, setSecure] = useState(true);
    const [secureConfirm, setSecureConfirm] = useState(true);

    const validateInputs = () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Hata', 'Şifreler eşleşmiyor.');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Hata', 'Geçerli bir e-posta adresi girin.');
            return false;
        }

        if (password.length < 6) {
            Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
            return false;
        }

        return true;
    };

    const handleRegister = async () => {
        if (!validateInputs()) return;

        try {
            setLoading(true);

            const response = await api.post('/auth/register', {
                name,
                email,
                password
            });

            Alert.alert(
                'Kayıt Başarılı',
                'Hesabınız başarıyla oluşturuldu.',
                [
                    {
                        text: 'Giriş Yap',
                        onPress: () => navigation.navigate('Login')
                    },
                    {
                        text: 'Otomatik Giriş',
                        onPress: async () => {
                            try {
                                // Auto login
                                const loginRes = await api.post('/auth/login', {
                                    email,
                                    password
                                });
                                // Handle login response as needed
                                navigation.navigate('Main');
                            } catch (error) {
                                Alert.alert('Giriş Hatası', 'Otomatik giriş yapılamadı, lütfen manuel olarak giriş yapın.');
                                navigation.navigate('Login');
                            }
                        }
                    }
                ]
            );
        } catch (error: any) {
            Alert.alert(
                'Kayıt Hatası',
                error.response?.data?.message || 'Kayıt olurken bir hata oluştu.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <Title style={styles.title}>Yeni Hesap Oluştur</Title>

                <View style={styles.form}>
                    <TextInput
                        label="Ad Soyad"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="account" />}
                    />

                    <TextInput
                        label="E-posta"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        mode="outlined"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        left={<TextInput.Icon icon="email" />}
                    />

                    <TextInput
                        label="Şifre"
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        mode="outlined"
                        secureTextEntry={secure}
                        right={<TextInput.Icon icon={secure ? "eye" : "eye-off"} onPress={() => setSecure(!secure)} />}
                        left={<TextInput.Icon icon="lock" />}
                    />

                    <TextInput
                        label="Şifre Tekrar"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        style={styles.input}
                        mode="outlined"
                        secureTextEntry={secureConfirm}
                        right={<TextInput.Icon icon={secureConfirm ? "eye" : "eye-off"} onPress={() => setSecureConfirm(!secureConfirm)} />}
                        left={<TextInput.Icon icon="lock" />}
                    />

                    <Button
                        mode="contained"
                        onPress={handleRegister}
                        style={styles.button}
                        loading={loading}
                        disabled={loading}
                    >
                        Kayıt Ol
                    </Button>

                    <View style={styles.loginContainer}>
                        <Text>Zaten hesabınız var mı?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginText}>Giriş Yap</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    keyboardAvoid: {
        flex: 1,
    },
    container: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    form: {
        width: '100%',
    },
    input: {
        marginBottom: 15,
    },
    button: {
        marginTop: 20,
        paddingVertical: 6,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    loginText: {
        marginLeft: 5,
        color: '#6200ee',
        fontWeight: 'bold',
    }
});

export default RegisterScreen; 