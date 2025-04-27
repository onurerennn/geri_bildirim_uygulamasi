import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Card, Button, Title, Paragraph, useTheme, List, Divider } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Question {
    _id: string;
    text: string;
    type: 'rating' | 'text' | 'multiple_choice';
    options?: string[];
    required: boolean;
}

interface Response {
    _id: string;
    answers: {
        question: string;
        value: string | number;
    }[];
    customer?: {
        _id: string;
        name: string;
    };
    createdAt: string;
}

interface Survey {
    _id: string;
    title: string;
    description: string;
    questions: Question[];
    business: string;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    createdAt: string;
    updatedAt: string;
    responses?: Response[];
}

interface SurveyDetailScreenProps {
    route: {
        params: {
            surveyId: string;
        }
    };
    navigation: any;
}

const SurveyDetailScreen = ({ route, navigation }: SurveyDetailScreenProps) => {
    const { surveyId } = route.params;
    const { token } = useAuth();
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [responses, setResponses] = useState<Response[]>([]);
    const [loading, setLoading] = useState(true);
    const [toggleLoading, setToggleLoading] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        fetchSurveyDetails();
        fetchSurveyResponses();
    }, []);

    const fetchSurveyDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/surveys/${surveyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSurvey(response.data.data);
            }
        } catch (error) {
            console.error('Anket detayları yüklenirken hata:', error);
            Alert.alert('Hata', 'Anket detayları yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSurveyResponses = async () => {
        try {
            const response = await api.get(`/responses/survey/${surveyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setResponses(response.data.data);
            }
        } catch (error) {
            console.error('Anket yanıtları yüklenirken hata:', error);
        }
    };

    const toggleSurveyStatus = async () => {
        if (!survey) return;

        try {
            setToggleLoading(true);

            const response = await api.put(`/surveys/${surveyId}/toggle-status`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSurvey({
                    ...survey,
                    isActive: !survey.isActive
                });

                Alert.alert(
                    'Başarılı',
                    `Anket ${survey.isActive ? 'pasif' : 'aktif'} duruma getirildi.`
                );
            }
        } catch (error) {
            console.error('Anket durumu değiştirilirken hata:', error);
            Alert.alert('Hata', 'Anket durumu değiştirilirken bir hata oluştu.');
        } finally {
            setToggleLoading(false);
        }
    };

    const generateQRCode = () => {
        navigation.navigate('QRCode', { surveyId });
    };

    const renderQuestionDetails = (question: Question, index: number) => (
        <Card style={styles.questionCard} key={question._id}>
            <Card.Content>
                <View style={styles.questionHeader}>
                    <Text style={styles.questionNumber}>Soru {index + 1}</Text>
                    <Text style={styles.questionType}>
                        {question.type === 'rating' ? 'Derecelendirme' :
                            question.type === 'text' ? 'Metin' : 'Çoktan Seçmeli'}
                    </Text>
                </View>
                <Text style={styles.questionText}>{question.text}</Text>

                {question.type === 'multiple_choice' && question.options && (
                    <View style={styles.optionsContainer}>
                        <Text style={styles.optionsTitle}>Seçenekler:</Text>
                        {question.options.map((option, i) => (
                            <Text key={i} style={styles.optionItem}>• {option}</Text>
                        ))}
                    </View>
                )}
            </Card.Content>
        </Card>
    );

    const renderResponseDetails = (response: Response, index: number) => (
        <Card style={styles.responseCard} key={response._id}>
            <Card.Content>
                <View style={styles.responseHeader}>
                    <Text style={styles.responseNumber}>Yanıt {index + 1}</Text>
                    <Text style={styles.responseDate}>
                        {new Date(response.createdAt).toLocaleDateString()}
                    </Text>
                </View>

                {response.customer && (
                    <Text style={styles.customerName}>
                        Yanıtlayan: {response.customer.name}
                    </Text>
                )}

                <Divider style={styles.divider} />

                {response.answers.map((answer, i) => {
                    const questionObj = survey?.questions.find(q => q._id === answer.question);

                    return (
                        <View key={i} style={styles.answerItem}>
                            <Text style={styles.answerQuestion}>
                                {questionObj?.text || `Soru ${i + 1}`}
                            </Text>
                            <Text style={styles.answerValue}>
                                {questionObj?.type === 'rating' ? `${answer.value}/5` : `${answer.value}`}
                            </Text>
                        </View>
                    );
                })}
            </Card.Content>
        </Card>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Anket detayları yükleniyor...</Text>
            </View>
        );
    }

    if (!survey) {
        return (
            <View style={styles.errorContainer}>
                <Text>Anket bulunamadı.</Text>
                <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
                    Geri Dön
                </Button>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.surveyCard}>
                <Card.Content>
                    <Title style={styles.surveyTitle}>{survey.title}</Title>
                    <Paragraph style={styles.surveyDescription}>{survey.description}</Paragraph>

                    <View style={styles.statusContainer}>
                        <Text style={styles.statusLabel}>Durum:</Text>
                        <Text style={[
                            styles.statusValue,
                            { color: survey.isActive ? 'green' : 'red' }
                        ]}>
                            {survey.isActive ? 'Aktif' : 'Pasif'}
                        </Text>
                    </View>

                    <View style={styles.metaContainer}>
                        <Text style={styles.metaItem}>
                            Oluşturulma: {new Date(survey.createdAt).toLocaleDateString()}
                        </Text>
                        <Text style={styles.metaItem}>
                            Soru Sayısı: {survey.questions.length}
                        </Text>
                        <Text style={styles.metaItem}>
                            Yanıt Sayısı: {responses.length}
                        </Text>
                    </View>
                </Card.Content>

                <Card.Actions style={styles.actionsContainer}>
                    <Button
                        mode="outlined"
                        onPress={toggleSurveyStatus}
                        loading={toggleLoading}
                        disabled={toggleLoading}
                    >
                        {survey.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                    </Button>
                    <Button
                        mode="contained"
                        onPress={generateQRCode}
                        icon="qrcode"
                    >
                        QR Kod
                    </Button>
                </Card.Actions>
            </Card>

            <Title style={styles.sectionTitle}>Sorular</Title>
            {survey.questions.map((question, index) => renderQuestionDetails(question, index))}

            <Title style={styles.sectionTitle}>Yanıtlar</Title>
            {responses.length > 0 ? (
                responses.map((response, index) => renderResponseDetails(response, index))
            ) : (
                <Card style={styles.emptyCard}>
                    <Card.Content>
                        <Text style={styles.emptyText}>Henüz yanıt yok.</Text>
                    </Card.Content>
                </Card>
            )}
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
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    button: {
        marginTop: 16,
    },
    surveyCard: {
        margin: 16,
        elevation: 2,
    },
    surveyTitle: {
        fontSize: 20,
        marginBottom: 8,
    },
    surveyDescription: {
        marginBottom: 16,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusLabel: {
        fontWeight: 'bold',
        marginRight: 8,
    },
    statusValue: {
        fontWeight: 'bold',
    },
    metaContainer: {
        marginTop: 8,
    },
    metaItem: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    actionsContainer: {
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    sectionTitle: {
        marginHorizontal: 16,
        marginTop: 24,
        marginBottom: 8,
    },
    questionCard: {
        marginHorizontal: 16,
        marginBottom: 8,
        elevation: 1,
    },
    questionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    questionNumber: {
        fontWeight: 'bold',
    },
    questionType: {
        fontSize: 12,
        color: '#666',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    questionText: {
        fontSize: 16,
        marginBottom: 8,
    },
    optionsContainer: {
        marginTop: 8,
        backgroundColor: '#f9f9f9',
        padding: 8,
        borderRadius: 4,
    },
    optionsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    optionItem: {
        marginLeft: 8,
        marginBottom: 2,
    },
    responseCard: {
        marginHorizontal: 16,
        marginBottom: 8,
        elevation: 1,
    },
    responseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    responseNumber: {
        fontWeight: 'bold',
    },
    responseDate: {
        fontSize: 12,
        color: '#666',
    },
    customerName: {
        fontStyle: 'italic',
        marginBottom: 8,
    },
    divider: {
        marginVertical: 8,
    },
    answerItem: {
        marginBottom: 8,
    },
    answerQuestion: {
        fontSize: 14,
        color: '#666',
    },
    answerValue: {
        fontSize: 16,
    },
    emptyCard: {
        margin: 16,
        padding: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
        padding: 16,
    },
});

export default SurveyDetailScreen; 