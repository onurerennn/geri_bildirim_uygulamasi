import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import surveyService from '../../services/surveyService';
import rewardService from '../../services/rewardService';
import { Survey } from '../../types';

const HomeScreen = () => {
    const [recentSurveys, setRecentSurveys] = useState<Survey[]>([]);
    const [points, setPoints] = useState<number>(0);
    const navigation = useNavigation();
    const theme = useTheme();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // TODO: Get actual business ID or user ID from context
            const surveys = await surveyService.getBusinessSurveys('dummy-id');
            setRecentSurveys(surveys.slice(0, 5));

            const userPoints = await rewardService.getUserPoints('dummy-id');
            setPoints(userPoints);
        } catch (error) {
            console.error('Error loading home data:', error);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.pointsCard}>
                <Card.Content>
                    <Title>Toplam Puanınız</Title>
                    <Paragraph style={styles.points}>{points}</Paragraph>
                    <Button
                        mode="contained"
                        onPress={() => navigation.navigate('Rewards' as never)}
                    >
                        Ödülleri Görüntüle
                    </Button>
                </Card.Content>
            </Card>

            <Title style={styles.sectionTitle}>Son Anketler</Title>
            {recentSurveys.map((survey) => (
                <Card key={survey.id} style={styles.surveyCard}>
                    <Card.Content>
                        <Title>{survey.title}</Title>
                        <Paragraph>
                            {new Date(survey.startDate).toLocaleDateString('tr-TR')} -{' '}
                            {new Date(survey.endDate).toLocaleDateString('tr-TR')}
                        </Paragraph>
                    </Card.Content>
                    <Card.Actions>
                        <Button onPress={() => {/* TODO: Navigate to survey details */ }}>
                            Detaylar
                        </Button>
                    </Card.Actions>
                </Card>
            ))}

            <Button
                mode="contained"
                icon="qrcode-scan"
                onPress={() => navigation.navigate('Scan' as never)}
                style={styles.scanButton}
            >
                QR Kod Tara
            </Button>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    pointsCard: {
        marginBottom: 24,
    },
    points: {
        fontSize: 36,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 16,
    },
    sectionTitle: {
        marginBottom: 16,
    },
    surveyCard: {
        marginBottom: 12,
    },
    scanButton: {
        marginVertical: 24,
    },
});

export default HomeScreen; 