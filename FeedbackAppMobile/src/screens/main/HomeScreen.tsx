import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { Text, Card, Button, Title, Paragraph, ActivityIndicator, useTheme, FAB } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Survey {
    _id: string;
    title: string;
    description: string;
    business: {
        _id: string;
        name: string;
        logo?: string;
    };
    isActive: boolean;
    createdAt: string;
}

const HomeScreen = ({ navigation }: any) => {
    const { user, token } = useAuth();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        fetchRecentSurveys();
    }, []);

    const fetchRecentSurveys = async () => {
        try {
            setLoading(true);
            const response = await api.get('/surveys/recent', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setSurveys(response.data.data || []);
        } catch (error) {
            console.error('Son anketler alınırken hata:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRecentSurveys();
    };

    const handleOpenQRScanner = () => {
        navigation.navigate('ScanQR');
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Anketler yükleniyor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Card style={styles.welcomeCard}>
                    <Card.Content>
                        <Title style={styles.welcomeTitle}>Hoş Geldiniz!</Title>
                        <Paragraph style={styles.welcomeText}>
                            İşletmelerin anketlerini yanıtlayarak puan kazanabilir ve ödüllere ulaşabilirsiniz. QR kodu tarayarak hemen başlayın!
                        </Paragraph>
                        <Button
                            mode="contained"
                            onPress={handleOpenQRScanner}
                            style={styles.scanButton}
                            icon="qrcode-scan"
                        >
                            QR Kod Tara
                        </Button>
                    </Card.Content>
                </Card>

                <Title style={styles.sectionTitle}>Son Eklenen Anketler</Title>

                {surveys.length > 0 ? (
                    surveys.map((survey) => (
                        <Card key={survey._id} style={styles.surveyCard}>
                            <Card.Content>
                                <View style={styles.businessInfo}>
                                    {survey.business.logo ? (
                                        <Image
                                            source={{ uri: survey.business.logo }}
                                            style={styles.businessLogo}
                                        />
                                    ) : (
                                        <View style={[styles.businessLogoPlaceholder, { backgroundColor: theme.colors.primary }]}>
                                            <Text style={styles.businessLogoText}>
                                                {survey.business.name.charAt(0)}
                                            </Text>
                                        </View>
                                    )}
                                    <Text style={styles.businessName}>{survey.business.name}</Text>
                                </View>
                                <Title style={styles.surveyTitle}>{survey.title}</Title>
                                <Paragraph style={styles.surveyDescription}>
                                    {survey.description.length > 100
                                        ? `${survey.description.substring(0, 100)}...`
                                        : survey.description}
                                </Paragraph>
                            </Card.Content>
                            <Card.Actions>
                                <Button
                                    onPress={() => navigation.navigate('SurveyResponse', { surveyId: survey._id })}
                                >
                                    Doldur
                                </Button>
                            </Card.Actions>
                        </Card>
                    ))
                ) : (
                    <Card style={styles.emptyCard}>
                        <Card.Content>
                            <Paragraph style={styles.emptyText}>
                                Henüz anket bulunmamaktadır. QR kod tarayarak bir ankete katılabilirsiniz.
                            </Paragraph>
                        </Card.Content>
                    </Card>
                )}
            </ScrollView>

            <FAB
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                icon="qrcode-scan"
                onPress={handleOpenQRScanner}
                label="QR Tara"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 80,
    },
    welcomeCard: {
        marginBottom: 24,
        elevation: 2,
    },
    welcomeTitle: {
        fontSize: 22,
        marginBottom: 8,
    },
    welcomeText: {
        fontSize: 16,
        marginBottom: 16,
    },
    scanButton: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        marginBottom: 16,
        fontWeight: 'bold',
    },
    surveyCard: {
        marginBottom: 16,
        elevation: 2,
    },
    businessInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    businessLogo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    businessLogoPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    businessLogoText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    businessName: {
        fontSize: 14,
        color: '#666',
    },
    surveyTitle: {
        fontSize: 18,
    },
    surveyDescription: {
        marginTop: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
    },
    emptyCard: {
        padding: 16,
        marginTop: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});

export default HomeScreen; 