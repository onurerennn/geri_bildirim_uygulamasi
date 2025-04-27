import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Card, Button, FAB, Title, Paragraph, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../types/navigation';
import surveyService from '../../services/surveyService';
import { Survey } from '../../types';

type SurveysScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Surveys'>;

const SurveysScreen = () => {
    const navigation = useNavigation<SurveysScreenNavigationProp>();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSurveys = async () => {
        try {
            setLoading(true);
            const fetchedSurveys = await surveyService.getBusinessSurveys();
            setSurveys(fetchedSurveys);
        } catch (error) {
            console.error('Error fetching surveys:', error);
            Alert.alert('Error', 'Failed to load surveys');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSurveys();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchSurveys();
    };

    const handleDeleteSurvey = async (surveyId: string) => {
        try {
            await surveyService.deleteSurvey(surveyId);
            setSurveys(surveys.filter(survey => survey._id !== surveyId));
            Alert.alert('Success', 'Survey deleted successfully');
        } catch (error) {
            console.error('Error deleting survey:', error);
            Alert.alert('Error', 'Failed to delete survey');
        }
    };

    const confirmDelete = (surveyId: string) => {
        Alert.alert(
            'Delete Survey',
            'Are you sure you want to delete this survey?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', onPress: () => handleDeleteSurvey(surveyId), style: 'destructive' }
            ]
        );
    };

    const handleCreateSurvey = () => {
        navigation.navigate('SurveyForm', {});
    };

    const handleViewQRCodes = (surveyId: string, surveyTitle: string) => {
        navigation.navigate('SurveyQRCodes', { surveyId, surveyTitle });
    };

    const handleEditSurvey = (survey: Survey) => {
        navigation.navigate('SurveyForm', { survey });
    };

    const handleViewDetails = (surveyId: string) => {
        navigation.navigate('SurveyDetails', { surveyId });
    };

    const renderSurveyItem = ({ item }: { item: Survey }) => (
        <Card style={styles.card}>
            <Card.Content>
                <Title>{item.title}</Title>
                <Paragraph>{item.description || 'No description'}</Paragraph>
                <Text style={styles.infoText}>
                    Status: <Text style={styles.statusText}>{item.status}</Text>
                </Text>
                <Text style={styles.infoText}>
                    Responses: {item.responseCount || 0}
                </Text>
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
                <IconButton
                    icon="eye"
                    size={20}
                    onPress={() => handleViewDetails(item._id)}
                />
                <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => handleEditSurvey(item)}
                />
                <IconButton
                    icon="qrcode"
                    size={20}
                    onPress={() => handleViewQRCodes(item._id, item.title)}
                />
                <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => confirmDelete(item._id)}
                />
            </Card.Actions>
        </Card>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Title>Surveys</Title>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
            ) : (
                <FlatList
                    data={surveys}
                    renderItem={renderSurveyItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContainer}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No surveys found</Text>
                            <Button mode="contained" onPress={handleRefresh}>
                                Refresh
                            </Button>
                        </View>
                    }
                />
            )}

            <FAB
                style={styles.fab}
                icon="plus"
                onPress={handleCreateSurvey}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        elevation: 2,
    },
    listContainer: {
        padding: 16,
    },
    card: {
        marginBottom: 16,
    },
    cardActions: {
        justifyContent: 'flex-end',
    },
    infoText: {
        marginTop: 8,
        fontSize: 14,
    },
    statusText: {
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        marginBottom: 16,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});

export default SurveysScreen; 