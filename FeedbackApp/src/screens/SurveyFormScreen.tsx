import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
// @ts-ignore 
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import apiService from '../services/api';
import { surveyService } from '../services/surveyService';
import { Rating } from 'react-native-ratings';
import { AuthContext, AuthContextType } from '../context/AuthContext';

type CustomerStackParamList = {
    CustomerTabs: undefined;
    SurveyForm: { surveyId: string; code?: string };
    Home: undefined;
};

type SurveyFormScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'SurveyForm'>;
type SurveyFormScreenRouteProp = RouteProp<CustomerStackParamList, 'SurveyForm'>;

type Props = {
    navigation: SurveyFormScreenNavigationProp;
    route: SurveyFormScreenRouteProp;
};

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
    questions: Question[];
    business: any;
    scannedAt?: string;
}

interface Answer {
    questionId: string;
    value: string | number;
}

const SurveyFormScreen: React.FC<Props> = ({ navigation, route }) => {
    const auth = useContext(AuthContext);
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isExistingResponse, setIsExistingResponse] = useState(false);

    const { surveyId, code } = route.params;

    useEffect(() => {
        loadSurvey();
    }, [surveyId]);

    const loadSurvey = async () => {
        try {
            setIsLoading(true);
            setError('');

            let surveyData;
            if (code) {
                // QR kodundan anket yükleme
                const response = await apiService.surveys.getByCode(code);
                if (!response.success) {
                    throw new Error(response.error || 'Anket bulunamadı');
                }
                surveyData = response.data;
            } else if (surveyId) {
                // Survey ID'den anket yükleme
                const response = await apiService.surveys.getById(surveyId, auth.userRole || 'CUSTOMER');
                if (!response.success) {
                    throw new Error(response.error || 'Anket bulunamadı');
                }
                surveyData = response.data;
            } else {
                throw new Error('Anket bilgisi bulunamadı');
            }

            if (!surveyData || !surveyData.questions || !Array.isArray(surveyData.questions) || surveyData.questions.length === 0) {
                throw new Error('Anket soruları bulunamadı');
            }

            setSurvey(surveyData);

            // Boş cevapları oluştur
            const initialAnswers = surveyData.questions.map((question: Question) => ({
                questionId: question._id,
                value: question.type === 'rating' ? 0 : ''
            }));

            setAnswers(initialAnswers);
        } catch (error: any) {
            console.error('Anket yükleme hatası:', error);
            setError(error.message || 'Anket yüklenirken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerChange = (questionId: string, value: string | number) => {
        setAnswers(prevAnswers =>
            prevAnswers.map(answer =>
                answer.questionId === questionId ? { ...answer, value } : answer
            )
        );
    };

    const isFormValid = () => {
        if (!survey) return false;

        // Tüm zorunlu sorular cevaplanmış mı kontrol et
        const requiredQuestions = survey.questions.filter(q => q.required);

        for (const question of requiredQuestions) {
            const answer = answers.find(a => a.questionId === question._id);

            if (!answer) return false;

            // Cevap tipine göre dolu olup olmadığını kontrol et
            if (
                (question.type === 'text' && (!answer.value || answer.value === '')) ||
                (question.type === 'rating' && (!answer.value || answer.value === 0)) ||
                (question.type === 'multiple_choice' && (!answer.value || answer.value === ''))
            ) {
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!survey || !isFormValid()) {
            Alert.alert(
                "Eksik Bilgi",
                "Lütfen tüm zorunlu soruları cevaplayın",
                [{ text: "Tamam" }]
            );
            return;
        }

        try {
            setIsSubmitting(true);

            // Cevapları doğru formatta hazırla
            const formattedAnswers = answers.map(answer => ({
                questionId: answer.questionId,
                value: answer.value
            }));

            console.log("Gönderilecek cevaplar:", formattedAnswers);

            // Kullanıcı bilgilerini ekleme
            const customerInfo = auth.userInfo ? {
                name: auth.userInfo.name || '',
                email: auth.userInfo.email || ''
            } : null;

            // Anket yanıtını gönder
            const response = await apiService.submitSurveyResponse(survey._id,
                formattedAnswers,
                customerInfo
            );

            console.log("API yanıtı:", response);

            // Önceki yanıt kontrolü
            if (response.data && response.data.isExistingResponse) {
                setIsExistingResponse(true);
            }

            setIsCompleted(true);
        } catch (error: any) {
            console.error("Anket gönderme hatası:", error);
            Alert.alert(
                "Hata",
                error.message || "Anket yanıtınız gönderilirken bir hata oluştu.",
                [{ text: "Tamam" }]
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderQuestion = (question: Question, index: number) => {
        const answer = answers.find(a => a.questionId === question._id);

        if (!answer) return null;

        return (
            <View key={question._id} style={styles.questionContainer}>
                <Text style={styles.questionNumber}>Soru {index + 1}</Text>
                <Text style={styles.questionText}>
                    {question.text}
                    {question.required && <Text style={styles.requiredMark}> *</Text>}
                </Text>

                {question.type === 'rating' && (
                    <View style={styles.ratingContainer}>
                        <Rating
                            type="star"
                            ratingCount={5}
                            imageSize={40}
                            showRating
                            fractions={0}
                            startingValue={answer.value as number || 0}
                            onFinishRating={(rating: number) => handleAnswerChange(question._id, rating)}
                        />
                    </View>
                )}

                {question.type === 'text' && (
                    <TextInput
                        style={styles.textInput}
                        value={answer.value as string}
                        onChangeText={(text) => handleAnswerChange(question._id, text)}
                        placeholder="Cevabınızı buraya yazın..."
                        multiline
                        textAlignVertical="top"
                    />
                )}

                {question.type === 'multiple_choice' && question.options && (
                    <View style={styles.optionsContainer}>
                        {question.options.map((option, optionIndex) => (
                            <TouchableOpacity
                                key={optionIndex}
                                style={[
                                    styles.optionItem,
                                    answer.value === option && styles.selectedOption
                                ]}
                                onPress={() => handleAnswerChange(question._id, option)}
                            >
                                <Text style={[
                                    styles.optionText,
                                    answer.value === option && styles.selectedOptionText
                                ]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    // Navigation çağrılarını düzelt
    const handleGoBack = () => {
        navigation.navigate('CustomerTabs');
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Anket yükleniyor...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Ionicons name="alert-circle" size={64} color="#e74c3c" />
                <Text style={styles.errorTitle}>Hata</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={loadSurvey}
                >
                    <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isCompleted) {
        return (
            <View style={styles.completedContainer}>
                <Ionicons
                    name={isExistingResponse ? "information-circle" : "checkmark-circle"}
                    size={100}
                    color={isExistingResponse ? "#3498db" : "#2ecc71"}
                />
                <Text style={styles.completedTitle}>
                    {isExistingResponse ? "Önceki Yanıtınız" : "Teşekkürler!"}
                </Text>
                <Text style={styles.completedText}>
                    {isExistingResponse
                        ? "Bu ankete daha önce yanıt verdiniz. Önceki yanıtınız sistemde kayıtlıdır."
                        : "Anket cevaplarınız başarıyla kaydedildi."}
                </Text>
                {auth.userInfo && (
                    <Text style={styles.completedUserInfo}>
                        <Text style={{ fontWeight: 'bold' }}>{auth.userInfo.name}</Text> olarak yanıtınız veritabanına kaydedildi.
                    </Text>
                )}
                <TouchableOpacity
                    style={styles.homeButton}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={styles.homeButtonText}>Ana Sayfaya Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Anket</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {survey && (
                <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
                    <View style={styles.surveyHeader}>
                        <Text style={styles.surveyTitle}>{survey.title}</Text>
                        {survey.description && (
                            <Text style={styles.surveyDescription}>{survey.description}</Text>
                        )}
                        {survey.business && survey.business.name && (
                            <Text style={styles.businessName}>{survey.business.name}</Text>
                        )}
                    </View>

                    <View style={styles.questionsContainer}>
                        {survey.questions.map((question, index) => renderQuestion(question, index))}
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            !isFormValid() && styles.disabledButton
                        ]}
                        onPress={handleSubmit}
                        disabled={!isFormValid() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="send" size={20} color="white" style={styles.submitIcon} />
                                <Text style={styles.submitButtonText}>Gönder</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#3498db',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        flex: 1,
        textAlign: 'center',
    },
    headerPlaceholder: {
        width: 40,
    },
    backButton: {
        padding: 8,
    },
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    surveyHeader: {
        marginBottom: 24,
    },
    surveyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 8,
    },
    surveyDescription: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 8,
    },
    businessName: {
        fontSize: 14,
        color: '#3498db',
    },
    questionsContainer: {
        marginBottom: 32,
    },
    questionContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    questionNumber: {
        fontSize: 14,
        color: '#3498db',
        marginBottom: 4,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2c3e50',
        marginBottom: 16,
    },
    requiredMark: {
        color: '#e74c3c',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        minHeight: 100,
        fontSize: 16,
    },
    ratingContainer: {
        alignItems: 'center',
        marginVertical: 8,
    },
    optionsContainer: {
        marginTop: 8,
    },
    optionItem: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 8,
    },
    selectedOption: {
        borderColor: '#3498db',
        backgroundColor: '#ecf0f1',
    },
    optionText: {
        fontSize: 16,
        color: '#34495e',
    },
    selectedOptionText: {
        color: '#3498db',
        fontWeight: '500',
    },
    submitButton: {
        backgroundColor: '#3498db',
        paddingVertical: 16,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    disabledButton: {
        backgroundColor: '#95a5a6',
    },
    submitIcon: {
        marginRight: 8,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingText: {
        fontSize: 16,
        color: '#34495e',
        marginTop: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#e74c3c',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: '#34495e',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    completedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    completedTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginVertical: 16,
    },
    completedText: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    completedUserInfo: {
        fontSize: 16,
        color: '#34495e',
        textAlign: 'center',
        marginTop: 16,
        backgroundColor: '#ecf0f1',
        padding: 10,
        borderRadius: 8,
        width: '90%',
    },
    homeButton: {
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 16,
    },
    homeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SurveyFormScreen; 