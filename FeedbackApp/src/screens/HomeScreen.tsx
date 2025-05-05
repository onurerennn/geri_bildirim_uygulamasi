import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import api from '../services/api';

interface Feedback {
    id: string;
    title: string;
    description: string;
    type: string;
    createdAt: string;
}

const HomeScreen = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Auth context'ten token al
    const { token } = useAuthContext();

    // Geri bildirimleri yükle
    useEffect(() => {
        const loadFeedbacks = async () => {
            setIsLoading(true);

            try {
                // API'den geri bildirimleri getir
                if (token) {
                    const data = await api.getFeedbacks(token);
                    setFeedbacks(data);
                    setError('');
                }
            } catch (err) {
                console.error('Geri bildirim yükleme hatası:', err);
                setError('Geri bildirimler yüklenirken bir hata oluştu');
            } finally {
                setIsLoading(false);
            }
        };

        loadFeedbacks();
    }, [token]);

    // Geri bildirim kartı
    const renderFeedbackItem = ({ item }: { item: Feedback }) => (
        <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
                <Text style={styles.feedbackTitle}>{item.title}</Text>
                <View style={styles.feedbackType}>
                    <Text style={styles.feedbackTypeText}>{item.type}</Text>
                </View>
            </View>
            <Text style={styles.feedbackDescription}>{item.description}</Text>
            <Text style={styles.feedbackDate}>
                {new Date(item.createdAt).toLocaleDateString('tr-TR')}
            </Text>
        </View>
    );

    // İçerik yükleniyor göstergesi
    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    // Hata mesajı
    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                        setIsLoading(true);
                        // Tekrar yükleme işlemi yapmak için state'i güncelle
                        setError('');
                    }}
                >
                    <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Veri yoksa mesaj göster
    if (feedbacks.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.noDataText}>Henüz geri bildirim bulunmuyor</Text>
                <TouchableOpacity style={styles.createButton}>
                    <Text style={styles.createButtonText}>Geri Bildirim Oluştur</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Geri bildirimler listesi
    return (
        <View style={styles.container}>
            <FlatList
                data={feedbacks}
                keyExtractor={(item) => item.id}
                renderItem={renderFeedbackItem}
                contentContainerStyle={styles.listContainer}
            />
            <TouchableOpacity style={styles.fab}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    listContainer: {
        paddingBottom: 80,
    },
    feedbackCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    feedbackHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    feedbackTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    feedbackType: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    feedbackTypeText: {
        color: '#1976d2',
        fontSize: 12,
        fontWeight: '600',
    },
    feedbackDescription: {
        fontSize: 14,
        color: '#555',
        marginBottom: 10,
    },
    feedbackDate: {
        fontSize: 12,
        color: '#888',
        textAlign: 'right',
    },
    errorText: {
        color: '#d32f2f',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    noDataText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    createButton: {
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignSelf: 'center',
    },
    createButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#3498db',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    fabText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
});

export default HomeScreen; 