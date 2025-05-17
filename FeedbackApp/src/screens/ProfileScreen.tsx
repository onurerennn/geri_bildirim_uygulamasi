import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
// @ts-ignore
import { CommonActions } from '@react-navigation/native';
// @ts-ignore
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface ProfileScreenProps {
    navigation: StackNavigationProp<any>;
}

interface UserInfo {
    name: string;
    email: string;
    role?: string;
    createdAt?: string;
}

const ProfileScreen = ({ navigation }: ProfileScreenProps) => {
    const { userRole, token, logout } = useAuthContext();
    const [userInfo, setUserInfo] = useState<UserInfo>({ name: 'Yükleniyor...', email: 'Yükleniyor...' });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // API'den kullanıcı bilgilerini al
            const response = await api.getUserProfile();

            if (response.success && response.data) {
                setUserInfo({
                    name: response.data.name || 'İsimsiz Kullanıcı',
                    email: response.data.email,
                    role: response.data.role,
                    createdAt: response.data.createdAt
                });

                // Bilgileri AsyncStorage'a da kaydet
                await AsyncStorage.setItem('userInfo', JSON.stringify(response.data));
            } else {
                throw new Error('Kullanıcı bilgileri alınamadı');
            }
        } catch (error) {
            console.error('Profil bilgileri yükleme hatası:', error);
            setError('Profil bilgileri yüklenirken bir hata oluştu');

            // Hata durumunda cached bilgileri kullan
            const cachedInfo = await AsyncStorage.getItem('userInfo');
            if (cachedInfo) {
                setUserInfo(JSON.parse(cachedInfo));
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Güvenli e-posta görüntüleme fonksiyonu
    const getSafeEmail = () => {
        return userInfo.email || 'kullanici@ornek.com';
    };

    // Güvenli isim görüntüleme fonksiyonu
    const getSafeName = () => {
        return userInfo.name || 'Kullanıcı';
    };

    // Güvenli avatar harfi alma
    const getAvatarLetter = () => {
        return userInfo.name ? userInfo.name.charAt(0).toUpperCase() : '?';
    };

    // Çıkış onayını göster
    const handleLogout = () => {
        Alert.alert(
            'Çıkış Yap',
            'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
            [
                {
                    text: 'İptal',
                    style: 'cancel',
                },
                {
                    text: 'Çıkış Yap',
                    onPress: async () => {
                        try {
                            await AsyncStorage.removeItem('userInfo');
                            await logout();
                            navigation.dispatch(
                                CommonActions.reset({
                                    index: 0,
                                    routes: [{ name: 'Login' }]
                                })
                            );
                        } catch (error) {
                            console.error('Çıkış yapma hatası:', error);
                            Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
                        }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Profil bilgileri yükleniyor...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={fetchUserProfile}
                    >
                        <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {getAvatarLetter()}
                    </Text>
                </View>
                <Text style={styles.name}>{getSafeName()}</Text>
                <Text style={styles.email}>{getSafeEmail()}</Text>
                {userInfo.role && (
                    <View style={styles.roleContainer}>
                        <Text style={styles.roleText}>
                            {userInfo.role === 'CUSTOMER' ? 'Müşteri' :
                                userInfo.role === 'BUSINESS_ADMIN' ? 'İşletme Yöneticisi' :
                                    userInfo.role === 'SUPER_ADMIN' ? 'Sistem Yöneticisi' :
                                        'Kullanıcı'}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hesap</Text>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="person-outline" size={22} color="#333" />
                    <Text style={styles.menuText}>Profilimi Düzenle</Text>
                    <Ionicons name="chevron-forward" size={22} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="lock-closed-outline" size={22} color="#333" />
                    <Text style={styles.menuText}>Şifremi Değiştir</Text>
                    <Ionicons name="chevron-forward" size={22} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="notifications-outline" size={22} color="#333" />
                    <Text style={styles.menuText}>Bildirim Ayarları</Text>
                    <Ionicons name="chevron-forward" size={22} color="#ccc" />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Uygulama</Text>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="help-circle-outline" size={22} color="#333" />
                    <Text style={styles.menuText}>Yardım ve Destek</Text>
                    <Ionicons name="chevron-forward" size={22} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="information-circle-outline" size={22} color="#333" />
                    <Text style={styles.menuText}>Hakkında</Text>
                    <Ionicons name="chevron-forward" size={22} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="star-outline" size={22} color="#333" />
                    <Text style={styles.menuText}>Uygulamayı Değerlendir</Text>
                    <Ionicons name="chevron-forward" size={22} color="#ccc" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color="#fff" />
                <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>Versiyon 1.0.0</Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: 'white',
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#3498db',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatarText: {
        color: 'white',
        fontSize: 30,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    email: {
        fontSize: 14,
        color: '#777',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 15,
        flex: 1,
    },
    logoutButton: {
        backgroundColor: '#ff3b30',
        marginHorizontal: 16,
        marginTop: 20,
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 10,
    },
    versionText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 12,
        marginTop: 20,
        marginBottom: 30,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 15,
        margin: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 14,
        marginBottom: 10,
    },
    retryButton: {
        backgroundColor: '#d32f2f',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    roleContainer: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 15,
        marginTop: 5,
    },
    roleText: {
        color: '#1976d2',
        fontSize: 12,
        fontWeight: '500',
    },
});

export default ProfileScreen; 