import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import api from '../services/api';
import { UserRole } from '../types/UserRole';

interface Survey {
    _id: string;
    title: string;
    description: string;
    isActive: boolean;
    createdAt: string;
}

// Navigation tipini tanımla
interface NavigationProps {
    navigate: (screen: string, params?: any) => void;
}

const SurveyListScreen = ({ navigation }: { navigation: NavigationProps }) => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Auth context'ten token ve user bilgisini al
    const { token, user } = useAuthContext();

    // Anketleri yükle
    useEffect(() => {
        const loadSurveys = async () => {
            setIsLoading(true);

            try {
                // API'den anketleri getir
                if (token) {
                    const data = await api.getFeedbacks(token);
                    setSurveys(data);
                    setError('');
                }
            } catch (err) {
                console.error('Anket yükleme hatası:', err);
                setError('Anketler yüklenirken bir hata oluştu');
            } finally {
                setIsLoading(false);
            }
        };

        loadSurveys();
    }, [token]);

    // Anket silme işlemi (sadece admin ve işletme admin)
    const handleDeleteSurvey = async (id: string) => {
        if (!user || (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.BUSINESS_ADMIN)) {
            Alert.alert('Hata', 'Bu işlemi yapmaya yetkiniz yok');
            return;
        }

        Alert.alert(
            'Onay',
            'Bu anketi silmek istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            if (token) {
                                await api.deleteFeedback(token, id);
                                // Silme başarılı olursa listeyi güncelle
                                setSurveys(surveys.filter(survey => survey._id !== id));
                            }
                        } catch (err) {
                            console.error('Anket silme hatası:', err);
                            Alert.alert('Hata', 'Anket silinirken bir hata oluştu');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Anket oluşturma ekranına git
    const handleCreateSurvey = () => {
        // Anket oluşturma sayfasına yönlendir
        navigation.navigate('CreateSurvey');
    };

    // Anket detayına git
    const handleViewSurveyDetail = (id: string) => {
        // Normalde anket detay sayfasına yönlendireceğiz
        // navigation.navigate('SurveyDetail', { id });
        Alert.alert('Bilgi', 'Anket detay ekranı henüz eklenmedi');
    };

    // Anket kartı
    const renderSurveyItem = ({ item }: { item: Survey }) => (
        <TouchableOpacity
            style={styles.surveyCard}
            onPress={() => handleViewSurveyDetail(item._id)}
        >
            <View style={styles.surveyHeader}>
                <Text style={styles.surveyTitle}>{item.title}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.isActive ? '#e3f2fd' : '#ffebee' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.isActive ? '#1976d2' : '#d32f2f' }
                    ]}>
                        {item.isActive ? 'Aktif' : 'Pasif'}
                    </Text>
                </View>
            </View>
            <Text style={styles.surveyDescription}>{item.description}</Text>
            <Text style={styles.surveyDate}>
                {new Date(item.createdAt).toLocaleDateString('tr-TR')}
            </Text>

            {/* Admin veya işletme admin için silme butonu */}
            {user && (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.BUSINESS_ADMIN) && (
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteSurvey(item._id)}
                >
                    <Text style={styles.deleteButtonText}>Sil</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
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
    if (surveys.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.noDataText}>Henüz anket bulunmuyor</Text>

                {/* Admin veya işletme admin için oluşturma butonu */}
                {user && (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.BUSINESS_ADMIN) && (
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={handleCreateSurvey}
                    >
                        <Text style={styles.createButtonText}>Anket Oluştur</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    // Anketler listesi
    return (
        <View style={styles.container}>
            <FlatList
                data={surveys}
                keyExtractor={(item) => item._id}
                renderItem={renderSurveyItem}
                contentContainerStyle={styles.listContainer}
            />

            {/* Admin veya işletme admin için yeni anket oluşturma butonu */}
            {user && (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.BUSINESS_ADMIN) && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={handleCreateSurvey}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            )}
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
    surveyCard: {
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
    surveyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    surveyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    surveyDescription: {
        fontSize: 14,
        color: '#555',
        marginBottom: 10,
    },
    surveyDate: {
        fontSize: 12,
        color: '#888',
        textAlign: 'right',
    },
    deleteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#ffebee',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    deleteButtonText: {
        color: '#d32f2f',
        fontSize: 12,
        fontWeight: '600',
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

export default SurveyListScreen; 