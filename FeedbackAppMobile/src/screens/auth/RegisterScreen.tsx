import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Title, SegmentedButtons } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import userService from '../../services/userService';
import { UserRole } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('customer');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        try {
            setLoading(true);
            await userService.register({
                name,
                email,
                password,
                role: role === 'super_admin' ? 'business_admin' : role,
            });
            // Navigation will be handled by auth context
        } catch (error) {
            console.error('Register error:', error);
            // TODO: Show error message
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Title style={styles.title}>Hesap Oluştur</Title>
            <TextInput
                label="Ad Soyad"
                value={name}
                onChangeText={setName}
                style={styles.input}
            />
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
            <SegmentedButtons
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                buttons={[
                    { value: 'customer', label: 'Müşteri' },
                    { value: 'business_admin', label: 'İşletme' },
                ]}
                style={styles.roleSelector}
            />
            <Button
                mode="contained"
                onPress={handleRegister}
                loading={loading}
                style={styles.button}
            >
                Kayıt Ol
            </Button>
            <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
                style={styles.button}
            >
                Giriş Yap
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
    roleSelector: {
        marginBottom: 16,
    },
    button: {
        marginTop: 8,
    },
});

export default RegisterScreen; 