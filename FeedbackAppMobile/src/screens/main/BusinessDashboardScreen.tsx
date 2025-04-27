import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, Avatar, Title, Paragraph, useTheme, FAB } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Survey {
    _id: string;
    title: string;
    description: string;
    questions: { _id: string; text: string }[];
    responseCount: number;
    isActive: boolean;
    createdAt: string;
}

interface FeedbackSummary {
    totalResponses: number;
    averageRating: number;
    recentFeedbacks: {
        _id: string;
        comment: string;
        rating: number;
        createdAt: string;
    }[];
}

const BusinessDashboardScreen = ({ navigation }: any) => {
    const { user, token } = useAuth();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();

    const fetchData = async () => {
        try {
            setLoading(true);
            // Anketleri getir
            const surveysResponse = await api.get('/surveys', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Özet geri bildirimleri getir
            const feedbackResponse = await api.get('/feedback/summary', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSurveys(surveysResponse.data.data || []);
            setFeedbackSummary(feedbackResponse.data.data || null);
        } catch (error) {
            console.error('Veri yüklenirken hata:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleCreateSurvey = () => {
        navigation.navigate('CreateSurvey');
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Card style={styles.summaryCard}>
                    <Card.Content>
                        <Title>Özet İstatistikler</Title>
                        {feedbackSummary ? (
                            <>
                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statValue}>{feedbackSummary.totalResponses}</Text>
                                        <Text style={styles.statLabel}>Toplam Yanıt</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statValue}>{feedbackSummary.averageRating.toFixed(1)}</Text>
                                        <Text style={styles.statLabel}>Ortalama Puan</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statValue}>{surveys.length}</Text>
                                        <Text style={styles.statLabel}>Aktif Anket</Text>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <Paragraph>Veri yükleniyor...</Paragraph>
                        )}
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Content>
                        <Title>Anketlerim</Title>
                    </Card.Content>
                    {surveys.length > 0 ? (
                        surveys.map((survey) => (
                            <Card key={survey._id} style={styles.surveyCard}>
                                <Card.Content>
                                    <Title>{survey.title}</Title>
                                    <Paragraph>{survey.description}</Paragraph>
                                    <View style={styles.surveyStats}>
                                        <Text>Sorular: {survey.questions.length}</Text>
                                        <Text>Yanıtlar: {survey.responseCount || 0}</Text>
                                        <Text>Durum: {survey.isActive ? 'Aktif' : 'Pasif'}</Text>
                                    </View>
                                </Card.Content>
                                <Card.Actions>
                                    <Button onPress={() => navigation.navigate('SurveyDetail', { surveyId: survey._id })}>
                                        Detaylar
                                    </Button>
                                    <Button onPress={() => navigation.navigate('QRCode', { surveyId: survey._id })}>
                                        QR Kod
                                    </Button>
                                </Card.Actions>
                            </Card>
                        ))
                    ) : (
                        <Paragraph style={styles.noDataText}>
                            Henüz anket oluşturmadınız. Yeni bir anket oluşturmak için aşağıdaki butonu kullanabilirsiniz.
                        </Paragraph>
                    )}
                </Card>

                <Card style={styles.card}>
                    <Card.Content>
                        <Title>Son Geri Bildirimler</Title>
                    </Card.Content>
                    {feedbackSummary && feedbackSummary.recentFeedbacks.length > 0 ? (
                        feedbackSummary.recentFeedbacks.map((feedback) => (
                            <Card key={feedback._id} style={styles.feedbackCard}>
                                <Card.Content>
                                    <View style={styles.feedbackHeader}>
                                        <Avatar.Text size={40} label={feedback.rating.toString()} />
                                        <View style={styles.feedbackMeta}>
                                            <Text style={styles.feedbackRating}>Puan: {feedback.rating}/5</Text>
                                            <Text style={styles.feedbackDate}>
                                                {new Date(feedback.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                    <Paragraph style={styles.feedbackComment}>{feedback.comment}</Paragraph>
                                </Card.Content>
                            </Card>
                        ))
                    ) : (
                        <Paragraph style={styles.noDataText}>
                            Henüz geri bildirim alınmamış.
                        </Paragraph>
                    )}
                </Card>
            </ScrollView>

            <FAB
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                icon="plus"
                onPress={handleCreateSurvey}
                label="Yeni Anket"
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
    summaryCard: {
        marginBottom: 16,
        elevation: 2,
    },
    card: {
        marginBottom: 16,
        elevation: 2,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
    },
    surveyCard: {
        marginHorizontal: 8,
        marginVertical: 8,
        elevation: 1,
    },
    feedbackCard: {
        marginHorizontal: 8,
        marginVertical: 8,
        elevation: 1,
    },
    feedbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    feedbackMeta: {
        marginLeft: 12,
    },
    feedbackRating: {
        fontWeight: 'bold',
    },
    feedbackDate: {
        fontSize: 12,
        color: '#666',
    },
    feedbackComment: {
        marginTop: 8,
    },
    surveyStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    noDataText: {
        textAlign: 'center',
        marginVertical: 16,
        color: '#666',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});

export default BusinessDashboardScreen; 