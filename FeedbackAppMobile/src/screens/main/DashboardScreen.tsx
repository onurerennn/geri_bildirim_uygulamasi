import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/UserRole';

type DashboardScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

const DashboardScreen = () => {
    const navigation = useNavigation<DashboardScreenNavigationProp>();
    const { user } = useAuth();
    const theme = useTheme();

    const menuItems = [
        {
            title: 'Kullanıcı Yönetimi',
            description: 'Kullanıcıları görüntüle, ekle, düzenle ve sil',
            onPress: () => navigation.navigate('Users'),
            roles: [UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN],
        },
        {
            title: 'İşletme Yönetimi',
            description: 'İşletmeleri görüntüle, ekle, düzenle ve onayla',
            onPress: () => navigation.navigate('Businesses'),
            roles: [UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN],
        },
        {
            title: 'Anket Yönetimi',
            description: 'Anketleri görüntüle, oluştur ve yönet',
            onPress: () => navigation.navigate('Surveys'),
            roles: [UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN],
        },
        {
            title: 'QR Kod Yönetimi',
            description: 'QR kodları oluştur ve yönet',
            onPress: () => navigation.navigate('QRCodes'),
            roles: [UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN],
        },
        {
            title: 'Profil',
            description: 'Profil bilgilerini görüntüle ve düzenle',
            onPress: () => navigation.navigate('Profile'),
            roles: [UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.CUSTOMER],
        },
    ];

    const filteredMenuItems = menuItems.filter(
        (item) => item.roles.includes(user?.role as UserRole)
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.grid}>
                {filteredMenuItems.map((item, index) => (
                    <Card
                        key={index}
                        style={styles.card}
                        onPress={item.onPress}
                    >
                        <Card.Content>
                            <Title>{item.title}</Title>
                            <Paragraph>{item.description}</Paragraph>
                        </Card.Content>
                    </Card>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    grid: {
        padding: 16,
        gap: 16,
    },
    card: {
        marginBottom: 16,
    },
});

export default DashboardScreen; 