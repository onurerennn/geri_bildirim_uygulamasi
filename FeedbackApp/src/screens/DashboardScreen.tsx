import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import api from '../services/api';

interface DashboardStats {
    totalSurveys: number;
    activeSurveys: number;
    totalResponses: number;
    recentResponses: number;
}

const DashboardScreen: React.FC = () => {
    const { user, logout } = useAuthContext();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalSurveys: 0,
        activeSurveys: 0,
        totalResponses: 0,
        recentResponses: 0
    });

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        // In a real implementation, this would fetch actual dashboard data from the API
        // This is just a placeholder
        try {
            setIsLoading(true);

            // Simulating API call
            setTimeout(() => {
                setStats({
                    totalSurveys: 12,
                    activeSurveys: 5,
                    totalResponses: 248,
                    recentResponses: 32
                });
                setIsLoading(false);
            }, 1000);

        } catch (error) {
            console.error('Dashboard data loading error:', error);
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Merhaba, {user?.name || 'Kullanıcı'}</Text>
                <Text style={styles.subGreeting}>İşte gösterge paneliniz</Text>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#3498db' }]}>
                            <Ionicons name="document-text" size={24} color="white" />
                        </View>
                        <Text style={styles.statValue}>{stats.totalSurveys}</Text>
                        <Text style={styles.statLabel}>Toplam Anket</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#2ecc71' }]}>
                            <Ionicons name="checkmark-circle" size={24} color="white" />
                        </View>
                        <Text style={styles.statValue}>{stats.activeSurveys}</Text>
                        <Text style={styles.statLabel}>Aktif Anket</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#f39c12' }]}>
                            <Ionicons name="chatbubble" size={24} color="white" />
                        </View>
                        <Text style={styles.statValue}>{stats.totalResponses}</Text>
                        <Text style={styles.statLabel}>Toplam Cevap</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#9b59b6' }]}>
                            <Ionicons name="time" size={24} color="white" />
                        </View>
                        <Text style={styles.statValue}>{stats.recentResponses}</Text>
                        <Text style={styles.statLabel}>Son 7 Gün</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hızlı Erişim</Text>

                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="add-circle" size={20} color="#3498db" style={styles.actionIcon} />
                    <Text style={styles.actionText}>Yeni Anket Oluştur</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="list" size={20} color="#3498db" style={styles.actionIcon} />
                    <Text style={styles.actionText}>Anketleri Görüntüle</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="analytics" size={20} color="#3498db" style={styles.actionIcon} />
                    <Text style={styles.actionText}>Analizleri Görüntüle</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#7f8c8d',
    },
    header: {
        padding: 20,
        paddingTop: 40,
        backgroundColor: '#3498db',
    },
    greeting: {
        fontSize: 26,
        fontWeight: 'bold',
        color: 'white',
    },
    subGreeting: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 5,
    },
    statsContainer: {
        padding: 15,
        marginTop: -30,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    statCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '48%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    statLabel: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 5,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 10,
        margin: 15,
        marginTop: 5,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    actionIcon: {
        marginRight: 10,
    },
    actionText: {
        fontSize: 16,
        color: '#34495e',
    },
});

export default DashboardScreen; 