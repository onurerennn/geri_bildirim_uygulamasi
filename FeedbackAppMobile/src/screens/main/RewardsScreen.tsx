import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { Text, Card, Button, ProgressBar, List, Title, useTheme, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Reward {
    _id: string;
    userId: string;
    businessId: string;
    business: {
        _id: string;
        name: string;
        logo?: string;
    };
    points: number;
    type: 'survey_completion' | 'referral';
    createdAt: string;
}

interface RewardSummary {
    totalPoints: number;
    businessPoints: {
        businessId: string;
        businessName: string;
        points: number;
        logo?: string;
    }[];
}

const RewardsScreen = () => {
    const { user, token } = useAuth();
    const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);
    const [rewardHistory, setRewardHistory] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        fetchRewardData();
    }, []);

    const fetchRewardData = async () => {
        try {
            setLoading(true);

            // Ödül özetini al
            const summaryResponse = await api.get('/rewards/summary', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Ödül geçmişini al
            const historyResponse = await api.get('/rewards', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setRewardSummary(summaryResponse.data.data || null);
            setRewardHistory(historyResponse.data.data || []);
        } catch (error) {
            console.error('Ödül verileri alınırken hata:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRewardData();
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Ödüller yükleniyor...</Text>
            </View>
        );
    }

    const REWARD_TIERS = [
        { tier: 'Bronze', points: 100, color: '#CD7F32' },
        { tier: 'Silver', points: 250, color: '#C0C0C0' },
        { tier: 'Gold', points: 500, color: '#FFD700' },
        { tier: 'Platinum', points: 1000, color: '#E5E4E2' }
    ];

    const getCurrentTier = (points: number) => {
        let currentTier = { tier: 'Başlangıç', points: 0, color: '#A9A9A9' };
        let nextTier = REWARD_TIERS[0];

        for (let i = 0; i < REWARD_TIERS.length; i++) {
            if (points >= REWARD_TIERS[i].points) {
                currentTier = REWARD_TIERS[i];
                nextTier = REWARD_TIERS[i + 1] || null;
            } else {
                nextTier = REWARD_TIERS[i];
                break;
            }
        }

        return { currentTier, nextTier };
    };

    const { currentTier, nextTier } = rewardSummary ? getCurrentTier(rewardSummary.totalPoints) : { currentTier: REWARD_TIERS[0], nextTier: REWARD_TIERS[1] };
    const progress = nextTier ? ((rewardSummary?.totalPoints || 0) - currentTier.points) / (nextTier.points - currentTier.points) : 1;

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Card style={styles.totalPointsCard}>
                    <Card.Content>
                        <Title style={styles.totalPointsTitle}>Toplam Puanınız</Title>
                        <Text style={styles.totalPoints}>{rewardSummary?.totalPoints || 0}</Text>

                        <View style={styles.tierContainer}>
                            <Text style={[styles.tierText, { color: currentTier.color }]}>
                                {currentTier.tier} Seviye
                            </Text>

                            {nextTier && (
                                <View style={styles.progressContainer}>
                                    <ProgressBar
                                        progress={progress}
                                        color={nextTier.color}
                                        style={styles.progressBar}
                                    />
                                    <View style={styles.progressLabels}>
                                        <Text style={styles.progressStart}>
                                            {currentTier.points}
                                        </Text>
                                        <Text style={styles.progressEnd}>
                                            {nextTier.points}
                                        </Text>
                                    </View>
                                    <Text style={styles.progressText}>
                                        Bir sonraki seviye için {nextTier.points - (rewardSummary?.totalPoints || 0)} puan daha kazanın
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Card.Content>
                </Card>

                {rewardSummary?.businessPoints && rewardSummary.businessPoints.length > 0 && (
                    <Card style={styles.businessPointsCard}>
                        <Card.Content>
                            <Title style={styles.sectionTitle}>İşletme Puanları</Title>

                            {rewardSummary.businessPoints.map((business) => (
                                <View key={business.businessId} style={styles.businessItem}>
                                    {business.logo ? (
                                        <Image
                                            source={{ uri: business.logo }}
                                            style={styles.businessLogo}
                                        />
                                    ) : (
                                        <View style={[styles.businessLogoPlaceholder, { backgroundColor: theme.colors.primary }]}>
                                            <Text style={styles.businessLogoText}>
                                                {business.businessName.charAt(0)}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.businessInfo}>
                                        <Text style={styles.businessName}>{business.businessName}</Text>
                                        <Text style={styles.businessPoints}>{business.points} puan</Text>
                                    </View>
                                </View>
                            ))}
                        </Card.Content>
                    </Card>
                )}

                <Card style={styles.rewardHistoryCard}>
                    <Card.Content>
                        <Title style={styles.sectionTitle}>Puan Geçmişi</Title>

                        {rewardHistory.length > 0 ? (
                            rewardHistory.map((reward) => (
                                <List.Item
                                    key={reward._id}
                                    title={`${reward.points} Puan ${reward.type === 'survey_completion' ? 'Anket' : 'Referans'} için`}
                                    description={`${reward.business.name} • ${new Date(reward.createdAt).toLocaleDateString()}`}
                                    left={props => (
                                        <List.Icon
                                            {...props}
                                            icon={reward.type === 'survey_completion' ? 'file-document' : 'account-multiple'}
                                            color={theme.colors.primary}
                                        />
                                    )}
                                />
                            ))
                        ) : (
                            <Text style={styles.emptyHistoryText}>
                                Henüz puan kazanmadınız. Anketlere katılarak puan kazanmaya başlayabilirsiniz.
                            </Text>
                        )}
                    </Card.Content>
                </Card>

                <Card style={styles.infoCard}>
                    <Card.Content>
                        <Title style={styles.sectionTitle}>Nasıl Puan Kazanılır?</Title>
                        <List.Item
                            title="Anketleri Yanıtla"
                            description="Her anket yanıtı için 10-50 puan kazanın"
                            left={props => <List.Icon {...props} icon="file-document" color={theme.colors.primary} />}
                        />
                        <List.Item
                            title="Arkadaşlarını Davet Et"
                            description="Her başarılı referans için 25 puan kazanın"
                            left={props => <List.Icon {...props} icon="account-multiple" color={theme.colors.primary} />}
                        />
                        <List.Item
                            title="Düzenli Katılım"
                            description="Aylık hedefleri tamamlayarak bonus puanlar kazanın"
                            left={props => <List.Icon {...props} icon="calendar-check" color={theme.colors.primary} />}
                        />
                    </Card.Content>
                </Card>
            </ScrollView>
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
        paddingBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
    },
    totalPointsCard: {
        marginBottom: 16,
        elevation: 2,
    },
    totalPointsTitle: {
        textAlign: 'center',
        marginBottom: 8,
    },
    totalPoints: {
        fontSize: 48,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 8,
    },
    tierContainer: {
        alignItems: 'center',
        marginTop: 16,
    },
    tierText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    progressContainer: {
        width: '100%',
        marginTop: 8,
    },
    progressBar: {
        height: 12,
        borderRadius: 6,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    progressStart: {
        fontSize: 12,
        color: '#666',
    },
    progressEnd: {
        fontSize: 12,
        color: '#666',
    },
    progressText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        color: '#666',
    },
    businessPointsCard: {
        marginBottom: 16,
        elevation: 2,
    },
    sectionTitle: {
        marginBottom: 16,
    },
    businessItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    businessLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    businessLogoPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    businessLogoText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    businessInfo: {
        marginLeft: 12,
        flex: 1,
    },
    businessName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    businessPoints: {
        fontSize: 14,
        color: '#666',
    },
    rewardHistoryCard: {
        marginBottom: 16,
        elevation: 2,
    },
    emptyHistoryText: {
        textAlign: 'center',
        color: '#666',
        marginVertical: 16,
    },
    infoCard: {
        marginBottom: 16,
        elevation: 2,
    },
});

export default RewardsScreen; 