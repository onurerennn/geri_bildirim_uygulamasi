import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
// @ts-ignore
import { CommonActions } from '@react-navigation/native';
// @ts-ignore
import { StackNavigationProp } from '@react-navigation/stack';

interface ProfileScreenProps {
    navigation: StackNavigationProp<any>;
}

const ProfileScreen = ({ navigation }: ProfileScreenProps) => {
    // Auth context'ten kullanıcı bilgileri ve çıkış fonksiyonunu al
    const { user, logout } = useAuthContext();

    // Güvenli e-posta görüntüleme fonksiyonu
    const getSafeEmail = () => {
        if (!user) return 'kullanici@ornek.com';
        return user.email || 'kullanici@ornek.com';
    };

    // Güvenli isim görüntüleme fonksiyonu
    const getSafeName = () => {
        if (!user) return 'Kullanıcı';
        return user.name || 'Kullanıcı';
    };

    // Güvenli avatar harfi alma
    const getAvatarLetter = () => {
        if (!user || !user.name) return '?';
        return user.name.charAt(0).toUpperCase();
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
                    onPress: () => {
                        logout(() => {
                            navigation.dispatch(
                                CommonActions.reset({
                                    index: 0,
                                    routes: [{ name: 'Login' }]
                                })
                            );
                        });
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {getAvatarLetter()}
                    </Text>
                </View>
                <Text style={styles.name}>{getSafeName()}</Text>
                <Text style={styles.email}>{getSafeEmail()}</Text>
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
});

export default ProfileScreen; 