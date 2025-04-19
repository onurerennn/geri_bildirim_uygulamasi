import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Title } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import userService from '../../services/userService';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        try {
            setLoading(true);
            await userService.login({ email, password });
            // Navigation will be handled by auth context
        } catch (error) {
            console.error('Login error:', error);
            // TODO: Show error message
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Title style={styles.title}>Geri Bildirim</Title>
            <TextInput
                label="E-posta"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
            />
            <TextInput
                label="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
            />
            <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                style={styles.button}
            >
                Giriş Yap
            </Button>
            <Button
                mode="text"
                onPress={() => navigation.navigate('Register')}
                style={styles.button}
            >
                Hesap Oluştur
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        marginBottom: 24,
        textAlign: 'center',
    },
    input: {
        marginBottom: 12,
    },
    button: {
        marginTop: 8,
    },
});

export default LoginScreen; 