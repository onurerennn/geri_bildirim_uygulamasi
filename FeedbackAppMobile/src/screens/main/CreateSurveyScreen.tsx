import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton, Title, Divider, RadioButton, Checkbox, useTheme, Portal, Dialog } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Question {
    id: string;
    text: string;
    type: 'rating' | 'text' | 'multiple_choice';
    options: string[];
    required: boolean;
}

const CreateSurveyScreen = ({ navigation }: any) => {
    const { user, token } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question>({
        id: Date.now().toString(),
        text: '',
        type: 'text',
        options: [],
        required: true
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editingIndex, setEditingIndex] = useState(-1);
    const [option, setOption] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const theme = useTheme();

    const addOption = () => {
        if (option.trim() !== '') {
            setCurrentQuestion(prev => ({
                ...prev,
                options: [...prev.options, option.trim()]
            }));
            setOption('');
        }
    };

    const removeOption = (index: number) => {
        setCurrentQuestion(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }));
    };

    const addQuestion = () => {
        if (!validateQuestion()) return;

        if (isEditing) {
            const updatedQuestions = [...questions];
            updatedQuestions[editingIndex] = currentQuestion;
            setQuestions(updatedQuestions);
            setIsEditing(false);
            setEditingIndex(-1);
        } else {
            setQuestions(prev => [...prev, currentQuestion]);
        }

        // Yeni soru için hazırlık
        resetCurrentQuestion();
    };

    const resetCurrentQuestion = () => {
        setCurrentQuestion({
            id: Date.now().toString(),
            text: '',
            type: 'text',
            options: [],
            required: true
        });
    };

    const editQuestion = (index: number) => {
        setCurrentQuestion(questions[index]);
        setIsEditing(true);
        setEditingIndex(index);
    };

    const deleteQuestion = (index: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const validateQuestion = () => {
        if (currentQuestion.text.trim() === '') {
            Alert.alert('Hata', 'Soru metni boş olamaz');
            return false;
        }

        if (currentQuestion.type === 'multiple_choice' && currentQuestion.options.length < 2) {
            Alert.alert('Hata', 'Çoktan seçmeli sorular için en az 2 seçenek gereklidir');
            return false;
        }

        return true;
    };

    const validateSurvey = () => {
        if (title.trim() === '') {
            Alert.alert('Hata', 'Anket başlığı boş olamaz');
            return false;
        }

        if (description.trim() === '') {
            Alert.alert('Hata', 'Anket açıklaması boş olamaz');
            return false;
        }

        if (questions.length === 0) {
            Alert.alert('Hata', 'Anket en az bir soru içermelidir');
            return false;
        }

        return true;
    };

    const createSurvey = async () => {
        if (!validateSurvey()) return;

        try {
            setLoading(true);

            // API'ye gönderilecek verileri hazırla
            const surveyData = {
                title,
                description,
                questions: questions.map(q => ({
                    text: q.text,
                    type: q.type,
                    options: q.type === 'multiple_choice' ? q.options : undefined,
                    required: q.required
                }))
            };

            const response = await api.post('/surveys', surveyData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert(
                'Başarılı',
                'Anket başarıyla oluşturuldu.',
                [
                    {
                        text: 'QR Kod Oluştur',
                        onPress: () => navigation.navigate('QRCode', { surveyId: response.data.data._id })
                    },
                    {
                        text: 'Ana Sayfa',
                        onPress: () => navigation.navigate('Home')
                    }
                ]
            );
        } catch (error) {
            console.error('Anket oluşturulurken hata:', error);
            Alert.alert('Hata', 'Anket oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const handleDiscardQuestion = () => {
        if (
            currentQuestion.text.trim() !== '' ||
            (currentQuestion.type === 'multiple_choice' && currentQuestion.options.length > 0)
        ) {
            setShowDialog(true);
        } else {
            resetCurrentQuestion();
            setIsEditing(false);
            setEditingIndex(-1);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Title style={styles.sectionTitle}>Anket Bilgileri</Title>
                <TextInput
                    label="Anket Başlığı"
                    value={title}
                    onChangeText={setTitle}
                    mode="outlined"
                    style={styles.input}
                />
                <TextInput
                    label="Anket Açıklaması"
                    value={description}
                    onChangeText={setDescription}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                />

                <Divider style={styles.divider} />

                <Title style={styles.sectionTitle}>Sorular</Title>
                {questions.map((question, index) => (
                    <View key={question.id} style={styles.questionItem}>
                        <View style={styles.questionHeader}>
                            <Text style={styles.questionNumber}>Soru {index + 1}</Text>
                            <View style={styles.questionActions}>
                                <IconButton
                                    icon="pencil"
                                    size={20}
                                    onPress={() => editQuestion(index)}
                                />
                                <IconButton
                                    icon="delete"
                                    size={20}
                                    onPress={() => deleteQuestion(index)}
                                />
                            </View>
                        </View>
                        <Text style={styles.questionText}>{question.text}</Text>
                        <View style={styles.questionMeta}>
                            <Text style={styles.questionMetaText}>
                                Tip: {question.type === 'text' ? 'Metin' : question.type === 'rating' ? 'Derecelendirme' : 'Çoktan Seçmeli'}
                            </Text>
                            <Text style={styles.questionMetaText}>
                                {question.required ? 'Zorunlu' : 'İsteğe bağlı'}
                            </Text>
                        </View>
                        {question.type === 'multiple_choice' && (
                            <View style={styles.optionsList}>
                                {question.options.map((opt, i) => (
                                    <Text key={i} style={styles.optionText}>• {opt}</Text>
                                ))}
                            </View>
                        )}
                    </View>
                ))}

                <Divider style={styles.divider} />

                <View style={styles.addQuestionSection}>
                    <Title style={styles.sectionTitle}>
                        {isEditing ? `Soru ${editingIndex + 1}'i Düzenle` : 'Yeni Soru Ekle'}
                    </Title>
                    <TextInput
                        label="Soru Metni"
                        value={currentQuestion.text}
                        onChangeText={text => setCurrentQuestion(prev => ({ ...prev, text }))}
                        mode="outlined"
                        style={styles.input}
                    />

                    <Text style={styles.label}>Soru Tipi</Text>
                    <RadioButton.Group
                        onValueChange={value => setCurrentQuestion(prev => ({
                            ...prev,
                            type: value as 'text' | 'rating' | 'multiple_choice',
                            options: value === 'multiple_choice' ? prev.options : []
                        }))}
                        value={currentQuestion.type}
                    >
                        <View style={styles.radioItem}>
                            <RadioButton value="text" />
                            <Text onPress={() => setCurrentQuestion(prev => ({ ...prev, type: 'text' }))}>
                                Metin
                            </Text>
                        </View>
                        <View style={styles.radioItem}>
                            <RadioButton value="rating" />
                            <Text onPress={() => setCurrentQuestion(prev => ({ ...prev, type: 'rating' }))}>
                                Derecelendirme (1-5)
                            </Text>
                        </View>
                        <View style={styles.radioItem}>
                            <RadioButton value="multiple_choice" />
                            <Text onPress={() => setCurrentQuestion(prev => ({ ...prev, type: 'multiple_choice' }))}>
                                Çoktan Seçmeli
                            </Text>
                        </View>
                    </RadioButton.Group>

                    {currentQuestion.type === 'multiple_choice' && (
                        <View style={styles.optionsSection}>
                            <Text style={styles.label}>Seçenekler</Text>
                            <View style={styles.optionInput}>
                                <TextInput
                                    label="Seçenek"
                                    value={option}
                                    onChangeText={setOption}
                                    mode="outlined"
                                    style={styles.optionTextInput}
                                />
                                <Button onPress={addOption} mode="contained" style={styles.addOptionButton}>
                                    Ekle
                                </Button>
                            </View>
                            {currentQuestion.options.map((opt, index) => (
                                <View key={index} style={styles.optionItem}>
                                    <Text style={styles.optionItemText}>{opt}</Text>
                                    <IconButton
                                        icon="close"
                                        size={20}
                                        onPress={() => removeOption(index)}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.checkboxContainer}>
                        <Checkbox
                            status={currentQuestion.required ? 'checked' : 'unchecked'}
                            onPress={() => setCurrentQuestion(prev => ({ ...prev, required: !prev.required }))}
                        />
                        <Text style={styles.checkboxLabel} onPress={() =>
                            setCurrentQuestion(prev => ({ ...prev, required: !prev.required }))
                        }>
                            Bu soru zorunlu
                        </Text>
                    </View>

                    <View style={styles.questionActions}>
                        <Button
                            mode="outlined"
                            onPress={handleDiscardQuestion}
                            style={styles.actionButton}
                        >
                            {isEditing ? 'İptal' : 'Temizle'}
                        </Button>
                        <Button
                            mode="contained"
                            onPress={addQuestion}
                            style={styles.actionButton}
                        >
                            {isEditing ? 'Güncelle' : 'Soru Ekle'}
                        </Button>
                    </View>
                </View>

                <Button
                    mode="contained"
                    onPress={createSurvey}
                    loading={loading}
                    disabled={loading}
                    style={styles.createButton}
                >
                    Anketi Oluştur
                </Button>
            </ScrollView>

            <Portal>
                <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
                    <Dialog.Title>Emin misiniz?</Dialog.Title>
                    <Dialog.Content>
                        <Text>Mevcut soru taslağını silmek istediğinizden emin misiniz?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setShowDialog(false)}>İptal</Button>
                        <Button onPress={() => {
                            setShowDialog(false);
                            resetCurrentQuestion();
                            setIsEditing(false);
                            setEditingIndex(-1);
                        }}>
                            Evet, Sil
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
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
    sectionTitle: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 16,
    },
    divider: {
        marginVertical: 24,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: 'bold',
    },
    radioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    optionsSection: {
        marginVertical: 16,
    },
    optionInput: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    optionTextInput: {
        flex: 1,
        marginRight: 8,
    },
    addOptionButton: {
        marginLeft: 8,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#e8e8e8',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    optionItemText: {
        flex: 1,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    checkboxLabel: {
        marginLeft: 8,
    },
    questionActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    actionButton: {
        flex: 1,
        marginHorizontal: 4,
    },
    createButton: {
        marginTop: 32,
        paddingVertical: 8,
    },
    questionItem: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    questionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    questionNumber: {
        fontWeight: 'bold',
        color: '#666',
    },
    questionText: {
        fontSize: 16,
        marginBottom: 8,
    },
    questionMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    questionMetaText: {
        fontSize: 12,
        color: '#666',
    },
    addQuestionSection: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    optionsList: {
        marginTop: 8,
        backgroundColor: '#f5f5f5',
        padding: 8,
        borderRadius: 4,
    },
    optionText: {
        marginBottom: 4,
    },
});

export default CreateSurveyScreen; 