import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Card, TextInput, Button, Title, RadioButton, useTheme } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Question {
    _id: string;
    text: string;
    type: 'rating' | 'text' | 'multiple_choice';
    options?: string[];
    required: boolean;
}

interface Survey {
    _id: string;
    title: string;
    description: string;
    business: {
        _id: string;
        name: string;
    };
    questions: Question[];
}

interface SurveyResponseScreenProps {
    route: {
        params: {
            surveyId: string;
            qrCode?: string;
        }
    };
    navigation: any;
}

const SurveyResponseScreen = ({ route, navigation }: SurveyResponseScreenProps) => {
    const { surveyId, qrCode } = route.params;
    const { user, token } = useAuth();
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [answers, setAnswers] = useState<{ [key: string]: string | number }>({});
    const theme = useTheme();

    useEffect(() => {
        fetchSurvey();
    }, []);

    const fetchSurvey = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/surveys/${surveyId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setSurvey(response.data.data);

            // Varsayılan boş cevapları ayarla
            const initialAnswers: { [key: string]: string | number } = {};
            response.data.data.questions.forEach((question: Question) => {
                if (question.type === 'rating') {
                    initialAnswers[question._id] = 0;
                } else {
                    initialAnswers[question._id] = '';
                }
            });
            setAnswers(initialAnswers);
        } catch (error) {
            console.error('Anket yüklenirken hata:', error);
            Alert.alert('Hata', 'Anket yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId: string, value: string | number) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const validateForm = () => {
        if (!survey) return false;

        let isValid = true;
        survey.questions.forEach(question => {
            if (question.required) {
                const answer = answers[question._id];
                if (
                    (typeof answer === 'string' && answer.trim() === '') ||
                    (question.type === 'rating' && (answer === 0 || answer === '0'))
                ) {
                    isValid = false;
                }
            }
        });

        return isValid;
    };

    const submitResponse = async () => {
        if (!survey) return;

        if (!validateForm()) {
            Alert.alert('Hata', 'Lütfen tüm zorunlu soruları cevaplayın.');
            return;
        }

        try {
            setSubmitting(true);

            // API'ye gönderilecek verileri hazırla
            const formattedAnswers = Object.keys(answers).map(questionId => ({
                question: questionId,
                value: answers[questionId]
            }));

            await api.post('/responses', {
                survey: surveyId,
                business: survey.business._id,
                answers: formattedAnswers,
                qrCode: qrCode
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            Alert.alert(
                'Teşekkürler!',
                'Anketi tamamladığınız için teşekkür ederiz.',
                [{ text: 'Tamam', onPress: () => navigation.navigate('Home') }]
            );
        } catch (error) {
            console.error('Anket gönderilirken hata:', error);
            Alert.alert('Hata', 'Anket gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderQuestionInput = (question: Question) => {
        switch (question.type) {
            case 'text':
                return (
                    <TextInput
                        mode="outlined"
                        multiline={true}
                        numberOfLines={3}
                        value={answers[question._id] as string}
                        onChangeText={(text) => handleAnswerChange(question._id, text)}
                        placeholder="Cevabınızı buraya yazın..."
                        style={styles.textInput}
                    />
                );

            case 'rating':
                return (
                    <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                            <Button
                                key={rating}
                                mode={Number(answers[question._id]) === rating ? 'contained' : 'outlined'}
                                onPress={() => handleAnswerChange(question._id, rating)}
                                style={styles.ratingButton}
                                contentStyle={styles.ratingButtonContent}
                            >
                                {rating.toString()}
                            </Button>
                        ))}
                    </View>
                );

            case 'multiple_choice':
                return (
                    <RadioButton.Group
                        onValueChange={(value) => handleAnswerChange(question._id, value)}
                        value={answers[question._id] as string}
                    >
                        {question.options?.map((option, index) => (
                            <View key={index} style={styles.radioItem}>
                                <RadioButton value={option} />
                                <Text onPress={() => handleAnswerChange(question._id, option)}>
                                    {option}
                                </Text>
                            </View>
                        ))}
                    </RadioButton.Group>
                );

            default:
                return null;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Anket yükleniyor...</Text>
            </View>
        );
    }

    if (!survey) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Anket bulunamadı.</Text>
                <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
                    Geri Dön
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Card style={styles.surveyCard}>
                    <Card.Content>
                        <Title>{survey.title}</Title>
                        <Text style={styles.businessName}>{survey.business.name}</Text>
                        <Text style={styles.surveyDescription}>{survey.description}</Text>
                    </Card.Content>
                </Card>

                {survey.questions.map((question, index) => (
                    <Card key={question._id} style={styles.questionCard}>
                        <Card.Content>
                            <Text style={styles.questionNumber}>Soru {index + 1}{question.required ? ' *' : ''}</Text>
                            <Text style={styles.questionText}>{question.text}</Text>
                            {renderQuestionInput(question)}
                        </Card.Content>
                    </Card>
                ))}

                <Button
                    mode="contained"
                    onPress={submitResponse}
                    loading={submitting}
                    disabled={submitting}
                    style={styles.submitButton}
                >
                    Anketi Tamamla
                </Button>
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
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
    },
    surveyCard: {
        marginBottom: 16,
        elevation: 2,
    },
    businessName: {
        fontSize: 14,
        color: '#666',
        marginVertical: 8,
    },
    surveyDescription: {
        marginTop: 8,
    },
    questionCard: {
        marginBottom: 16,
        elevation: 1,
    },
    questionNumber: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    questionText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    textInput: {
        marginTop: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    ratingButton: {
        width: '18%',
        margin: 0,
    },
    ratingButtonContent: {
        height: 40,
    },
    radioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    button: {
        marginTop: 16,
    },
    submitButton: {
        marginTop: 24,
        paddingVertical: 8,
    },
});

export default SurveyResponseScreen; 