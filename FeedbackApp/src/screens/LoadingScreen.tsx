import React, { useState, useEffect, useContext } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
    Loading: undefined;
    Login: undefined;
    Register: undefined;
    Main: undefined;
    AdminTabs: undefined;
    BusinessAdminTabs: undefined;
    CustomerTabs: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const LoadingScreen: React.FC = () => {
    const [status, setStatus] = useState('Bağlantı kontrol ediliyor...');
    const [isError, setIsError] = useState(false);
    const navigation = useNavigation<NavigationProp>();
    const auth = useContext(AuthContext);

    useEffect(() => {
        checkConnectionAndAuth();
    }, []);

    const checkConnectionAndAuth = async () => {
        try {
            // API bağlantısını kontrol et
            setStatus('API bağlantısı kontrol ediliyor...');
            const result = await api.testConnection();

            if (!result.success) {
                setStatus(`Bağlantı hatası: ${result.message}`);
                setIsError(true);
                return;
            }

            setStatus('Bağlantı başarılı, oturum kontrol ediliyor...');

            // Token kontrolü
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                setStatus('Oturum bulunamadı, giriş sayfasına yönlendiriliyorsunuz...');
                setTimeout(() => {
                    navigation.replace('Login');
                }, 1000);
                return;
            }

            // Token geçerliliğini kontrol et
            try {
                const response = await api.getUserProfile();
                if (response.success && response.data) {
                    setStatus('Oturum doğrulandı, yönlendiriliyorsunuz...');

                    // Auth context'i güncelle
                    await auth.login(token, response.data.role);

                    // Role göre yönlendirme
                    setTimeout(() => {
                        navigation.replace('Main');
                    }, 1000);
                } else {
                    throw new Error('Geçersiz kullanıcı profili');
                }
            } catch (error) {
                // Token geçersiz veya süresi dolmuş
                await AsyncStorage.removeItem('userToken');
                setStatus('Oturum süresi dolmuş, giriş sayfasına yönlendiriliyorsunuz...');
                setTimeout(() => {
                    navigation.replace('Login');
                }, 1000);
            }
        } catch (error: any) {
            setStatus(`Bağlantı hatası: ${error.message}`);
            setIsError(true);
        }
    };

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#3498db" style={styles.spinner} />
            <Text style={[
                styles.statusText,
                isError && styles.errorText
            ]}>
                {status}
            </Text>
            {isError && (
                <Text style={styles.retryText}>
                    Alternatif bağlantılar deneniyor...
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20
    },
    spinner: {
        marginBottom: 20
    },
    statusText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 10
    },
    errorText: {
        color: '#e74c3c'
    },
    retryText: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center'
    }
});

export default LoadingScreen; 