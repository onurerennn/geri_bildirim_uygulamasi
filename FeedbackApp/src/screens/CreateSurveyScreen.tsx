import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import api from '../services/api';
// @ts-ignore
import { Picker } from '@react-native-picker/picker';
import { UserRole } from '../types/UserRole';

// Soru tipi tanımlaması
type QuestionType = 'rating' | 'text' | 'multiple_choice';

// Soru için arayüz
interface Question {
    id: string; // Geçici client-side ID
    text: string;
    type: QuestionType;
    options?: string[];
    required: boolean;
}

// Navigation için prop tipi
interface NavigationProps {
    navigation: any;
}

const CreateSurveyScreen: React.FC<NavigationProps> = ({ navigation }) => {
    // Auth context'ten token ve user bilgisini al
    const { token, user } = useAuthContext();

    // State tanımlamaları
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [businessInfo, setBusinessInfo] = useState<any>(null); // İşletme bilgilerini tutacak state

    // Kullanıcı ve işletme bilgilerini kontrol et
    useEffect(() => {
        const checkUserAndBusinessInfo = async () => {
            if (!token) {
                setError('Oturum bilginiz bulunamadı. Lütfen tekrar giriş yapın.');
                return;
            }

            try {
                // Profil bilgilerini getir
                const userProfile = await api.getUserProfile(token);
                console.log('Kullanıcı profil kontrolü:', userProfile);

                // İşletme yöneticisi değilse uyarı göster
                if (userProfile.role !== UserRole.BUSINESS_ADMIN && userProfile.role !== UserRole.SUPER_ADMIN) {
                    setError('Bu özelliği kullanmak için işletme yöneticisi olmanız gerekiyor.');
                    return;
                }

                // İşletme ID kontrol et - birden fazla kaynaktan almayı dene
                let businessId = null;

                // 1. doğrudan profile'daki businessId
                if (userProfile.businessId) {
                    businessId = userProfile.businessId;
                    console.log(`İşletme ID direkt olarak bulundu: ${businessId}`);
                }
                // 2. business alanından alınabilir (string ise)
                else if (userProfile.business && typeof userProfile.business === 'string') {
                    businessId = userProfile.business;
                    console.log(`İşletme ID string olarak bulundu: ${businessId}`);
                }
                // 3. business objesinden alınabilir
                else if (userProfile.business && typeof userProfile.business === 'object' && userProfile.business._id) {
                    businessId = userProfile.business._id;
                    console.log(`İşletme ID business objesinden bulundu: ${businessId}`);

                    // Aynı zamanda işletme verisi olarak da ayarla
                    if (!userProfile.businessData) {
                        userProfile.businessData = userProfile.business;
                    }
                }
                // 4. businessData objesinden alınabilir
                else if (userProfile.businessData && userProfile.businessData._id) {
                    businessId = userProfile.businessData._id;
                    console.log(`İşletme ID businessData objesinden bulundu: ${businessId}`);
                }

                // İşletme bilgisi al
                if (businessId) {
                    try {
                        // Eğer zaten işletme verisi varsa tekrar getirmeye gerek yok
                        if (userProfile.businessData) {
                            setBusinessInfo(userProfile.businessData);
                            console.log('İşletme bilgileri profile içinde mevcut:', userProfile.businessData.name || 'İsimsiz');
                        } else {
                            // İşletme bilgilerini getir
                            const businessData = await api.getBusiness(token, businessId).catch(() => null);

                            if (businessData) {
                                setBusinessInfo(businessData);
                                console.log('İşletme bilgileri alındı:', businessData.name || 'İsimsiz');
                            } else {
                                // İşletme bulunamadıysa, yeni bir strategi deneyelim
                                await tryAlternativeBusinessDataFetch(userProfile);
                            }
                        }
                    } catch (err) {
                        console.warn('İşletme bilgileri getirilemedi:', err);
                        // Alternatif bilgi getirme yöntemini dene
                        await tryAlternativeBusinessDataFetch(userProfile);
                    }
                } else if (userProfile.role === UserRole.BUSINESS_ADMIN || userProfile.role === UserRole.SUPER_ADMIN) {
                    // İşletme ID yoksa, alternatif yöntemler deneyelim
                    await tryAlternativeBusinessDataFetch(userProfile);
                }
            } catch (err) {
                console.error('Profil kontrolü hatası:', err);
                setError('Profil bilgileriniz kontrol edilirken bir hata oluştu.');
            }
        };

        // Alternatif işletme bilgileri getirme yöntemlerini içeren fonksiyon
        const tryAlternativeBusinessDataFetch = async (userProfile: any) => {
            console.log('Alternatif işletme bilgileri getirme yöntemleri deneniyor...');

            // Token kontrolü - boş ise işlem yapma
            if (!token) {
                console.warn('Token bulunamadı, işlemler yapılamıyor');
                setError('Oturum bilgileriniz eksik. Lütfen tekrar giriş yapın.');
                return;
            }

            // Yöntem 1: İşletme listesinden kullanıcının e-posta adresine göre eşleşen bir işletme arama
            try {
                console.log('İşletme listesi getiriliyor...');
                const allBusinesses = await api.getBusinesses(token);

                if (Array.isArray(allBusinesses) && allBusinesses.length > 0) {
                    console.log(`${allBusinesses.length} işletme bulundu, eşleşme aranıyor...`);

                    // E-posta adresi alanlarına göre eşleşme yap
                    const matchedBusiness = allBusinesses.find(
                        business => business.email?.toLowerCase() === userProfile.email?.toLowerCase()
                    );

                    if (matchedBusiness) {
                        console.log('Kullanıcı e-posta adresine göre işletme bulundu:', matchedBusiness.name);
                        setBusinessInfo(matchedBusiness);
                        return;
                    }

                    // Kullanıcının yönetici olduğu bir işletme bulunamadıysa ve SUPER_ADMIN değilse
                    // ilk işletmeyi kullan (acil durum çözümü)
                    if (userProfile.role === UserRole.BUSINESS_ADMIN && allBusinesses.length > 0) {
                        console.log('Kullanıcı için özel işletme bulunamadı, ilk işletme atanıyor:', allBusinesses[0].name);
                        setBusinessInfo(allBusinesses[0]);
                        return;
                    }
                }
            } catch (businessListError) {
                console.warn('İşletme listesi getirilemedi:', businessListError);
            }

            // Yöntem 2: API'den kendi işletmemi getir (my-business endpoint'i)
            try {
                console.log('My-business endpoint\'i deneniyor...');
                const myBusinessResponse = await fetch(`${api.getApiUrl()}/api/businesses/my-business`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (myBusinessResponse.ok) {
                    const myBusinessData = await myBusinessResponse.json();
                    if (myBusinessData && (myBusinessData._id || (myBusinessData.data && myBusinessData.data._id))) {
                        const business = myBusinessData.data || myBusinessData;
                        console.log('My-business ile işletme bulundu:', business.name);
                        setBusinessInfo(business);
                        return;
                    }
                }
            } catch (myBusinessError) {
                console.warn('My-business API hatası:', myBusinessError);
            }

            // Yöntem 3: SUPER_ADMIN için geçici işletme bilgisi oluştur
            if (userProfile.role === UserRole.SUPER_ADMIN) {
                console.log('SUPER_ADMIN için geçici işletme bilgisi oluşturuluyor...');
                const temporaryBusiness = {
                    _id: 'temp_admin_business_' + new Date().getTime(),
                    name: 'Sistem Yönetimi',
                    address: 'Sistem Yönetici İşletmesi',
                    isActive: true,
                    isTemporary: true
                };
                setBusinessInfo(temporaryBusiness);
                return;
            }

            // Yöntem 4: Varsayılan değerlere başvur
            console.log('Varsayılan işletme bilgisi oluşturuluyor...');
            // Geçici/varsayılan işletme bilgisi oluştur
            const defaultBusiness = {
                _id: 'default_business_' + userProfile._id,
                name: `${userProfile.name || 'Kullanıcı'} İşletmesi`,
                address: 'Varsayılan Adres',
                isActive: true,
                isTemporary: true
            };
            setBusinessInfo(defaultBusiness);

            // Bilgilendirme mesajı göster
            setError('İşletme bilgileriniz bulunamadı, varsayılan bilgiler kullanılacak. Lütfen sistem yöneticinizle iletişime geçin.');
        };

        checkUserAndBusinessInfo();
    }, [token]);

    // Yeni soru ekleme modal state'leri
    const [modalVisible, setModalVisible] = useState(false);
    const [newQuestion, setNewQuestion] = useState<Question>({
        id: Date.now().toString(),
        text: '',
        type: 'text',
        required: true
    });
    const [optionText, setOptionText] = useState('');
    const [options, setOptions] = useState<string[]>([]);

    // Seçeneği ekleme fonksiyonu
    const addOption = () => {
        if (optionText.trim()) {
            setOptions([...options, optionText.trim()]);
            setOptionText('');
        }
    };

    // Seçeneği silme fonksiyonu
    const removeOption = (index: number) => {
        const newOptions = [...options];
        newOptions.splice(index, 1);
        setOptions(newOptions);
    };

    // Yeni soru ekleme fonksiyonu
    const addQuestion = () => {
        if (!newQuestion.text.trim()) {
            Alert.alert('Hata', 'Soru metni boş olamaz');
            return;
        }

        if (newQuestion.type === 'multiple_choice' && options.length < 2) {
            Alert.alert('Hata', 'Çoktan seçmeli sorularda en az 2 seçenek olmalıdır');
            return;
        }

        // Soruyu sorular dizisine ekle
        const questionToAdd = {
            ...newQuestion,
            options: newQuestion.type === 'multiple_choice' ? options : undefined
        };

        setQuestions([...questions, questionToAdd]);

        // Formu temizle
        setNewQuestion({
            id: Date.now().toString(),
            text: '',
            type: 'text',
            required: true
        });
        setOptions([]);
        setModalVisible(false);
    };

    // Soru silme fonksiyonu
    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    // Anket oluşturma fonksiyonu
    const handleCreateSurvey = async () => {
        // Form doğrulaması
        if (!title.trim() || !description.trim() || questions.length === 0) {
            Alert.alert('Hata', 'Anket başlığı, açıklaması ve en az bir soru gereklidir');
            return;
        }

        // İşletme bilgisi kontrolü
        if (!businessInfo || !businessInfo._id) {
            Alert.alert(
                'İşletme Bilgisi Eksik',
                'Hesabınızla ilişkilendirilmiş bir işletme bulunamadı. Anket oluşturmak için işletme bilgilerinizin tanımlanmış olması gerekir.',
                [
                    {
                        text: 'Tamam',
                        style: 'cancel'
                    },
                    {
                        text: 'Varsayılan İşletme Oluştur',
                        onPress: async () => {
                            // Varsayılan işletme bilgisi oluştur
                            const defaultBusiness = {
                                _id: 'default_business_' + (user?._id || new Date().getTime()),
                                name: `${user?.name || 'Kullanıcı'} İşletmesi`,
                                address: 'Varsayılan Adres',
                                isActive: true,
                                isTemporary: true
                            };
                            setBusinessInfo(defaultBusiness);

                            // İşletme bilgisi oluşturulduktan sonra anket oluşturmayı tekrar dene
                            Alert.alert(
                                'Bilgi',
                                'Varsayılan işletme bilgisi oluşturuldu. Şimdi anket oluşturabilirsiniz.',
                                [
                                    {
                                        text: 'Anket Oluştur',
                                        onPress: () => handleCreateSurvey()
                                    }
                                ]
                            );
                        }
                    }
                ]
            );
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // API için soru formatını hazırla
            const formattedQuestions = questions.map(question => {
                // Temel soru yapısı
                const formattedQuestion: any = {
                    text: question.text,
                    type: question.type,
                    required: question.required
                };

                // Eğer çoktan seçmeli soru ise seçenekleri ekle
                if (question.type === 'multiple_choice' && question.options && question.options.length > 0) {
                    formattedQuestion.options = question.options;
                }

                return formattedQuestion;
            });

            console.log('Anket oluşturma başlatılıyor:', {
                title,
                description,
                questionCount: formattedQuestions.length,
                businessId: businessInfo._id
            });

            if (token) {
                // Debug için verileri konsolda görüntüle
                console.log('Gönderilecek anket verisi:', {
                    title,
                    description,
                    questions: formattedQuestions,
                    businessId: businessInfo._id
                });

                // Anket oluştur
                const result = await api.createFeedback(token, {
                    title,
                    description,
                    questions: formattedQuestions,
                    businessId: businessInfo._id
                });

                console.log('Anket oluşturma sonucu:', result);

                // Başarılı ise kullanıcıya bildir
                Alert.alert(
                    'Başarılı',
                    'Anket başarıyla oluşturuldu',
                    [{
                        text: 'Tamam',
                        onPress: () => {
                            // Anket listesini güncellemek için önceki ekrana dön
                            navigation.goBack();
                        }
                    }]
                );
            } else {
                throw new Error('Oturum açmanız gerekiyor');
            }
        } catch (err: any) {
            console.error('Anket oluşturma hatası:', err);

            // Hata mesajını görüntüle
            const errorMessage = err.message || 'Anket oluşturulurken bir hata oluştu';
            setError(errorMessage);

            // Detaylı hata bilgisi ile alert göster
            Alert.alert(
                'Hata',
                errorMessage,
                [
                    {
                        text: 'Tamam',
                        style: 'cancel'
                    },
                    // Eğer hata işletme bulunamadıysa, kullanıcıya yeni deneme fırsatı ver
                    ...(errorMessage.includes('İşletme bilgisi') ? [{
                        text: 'Varsayılan İşletme Oluştur',
                        onPress: async () => {
                            // Varsayılan işletme bilgisi oluştur
                            const defaultBusiness = {
                                _id: 'default_business_' + (user?._id || new Date().getTime()),
                                name: `${user?.name || 'Kullanıcı'} İşletmesi`,
                                address: 'Varsayılan Adres',
                                isActive: true,
                                isTemporary: true
                            };
                            setBusinessInfo(defaultBusiness);

                            // Bilgilendirme mesajı
                            Alert.alert(
                                'Bilgi',
                                'Varsayılan işletme bilgisi oluşturuldu. Şimdi anket oluşturmayı tekrar deneyebilirsiniz.',
                                [
                                    {
                                        text: 'Tekrar Dene',
                                        onPress: () => handleCreateSurvey()
                                    }
                                ]
                            );
                        }
                    }] : []),
                    ...(errorMessage.includes('İşletme bilgisi') ? [{
                        text: 'Tekrar Dene',
                        onPress: async () => {
                            // İşletme bilgilerini tekrar almayı dene
                            if (!token) {
                                console.warn('Token bulunamadı, işlemler yapılamıyor');
                                Alert.alert('Hata', 'Oturum bilgileriniz eksik. Lütfen tekrar giriş yapın.');
                                return;
                            }

                            try {
                                const userProfile = await api.getUserProfile(token);
                                const alternativeFetch = async (profile: any) => {
                                    console.log('İşletme bilgilerini tekrar almayı deniyorum...');
                                    try {
                                        const allBusinesses = await api.getBusinesses(token);
                                        if (Array.isArray(allBusinesses) && allBusinesses.length > 0) {
                                            console.log('İşletme listesinden ilk işletme kullanılıyor:', allBusinesses[0].name);
                                            setBusinessInfo(allBusinesses[0]);
                                            Alert.alert('Bilgi', 'İşletme bilgisi güncellendi. Şimdi anket oluşturmayı tekrar deneyebilirsiniz.');
                                        } else {
                                            // Hiç işletme bulunamadıysa, geçici bir işletme oluştur
                                            const tempBusiness = {
                                                _id: 'temp_business_' + new Date().getTime(),
                                                name: 'Geçici İşletme',
                                                address: 'Geçici Adres',
                                                isActive: true,
                                                isTemporary: true
                                            };
                                            setBusinessInfo(tempBusiness);
                                            Alert.alert('Bilgi', 'Geçici işletme bilgisi oluşturuldu. Şimdi anket oluşturmayı tekrar deneyebilirsiniz.');
                                        }
                                    } catch (error) {
                                        console.error('Alternatif işletme bilgisi alınamadı:', error);
                                        // Son çare: Geçici işletme oluştur
                                        const emergencyBusiness = {
                                            _id: 'emergency_business_' + new Date().getTime(),
                                            name: 'Acil Durum İşletmesi',
                                            address: 'Acil Durum',
                                            isActive: true,
                                            isTemporary: true
                                        };
                                        setBusinessInfo(emergencyBusiness);
                                        Alert.alert('Bilgi', 'Acil durum işletme bilgisi oluşturuldu. Şimdi anket oluşturmayı tekrar deneyebilirsiniz.');
                                    }
                                };
                                alternativeFetch(userProfile);
                            } catch (profileError) {
                                console.error('Kullanıcı profili alınamadı:', profileError);
                                Alert.alert('Hata', 'Profil bilgileriniz alınamadı. Lütfen daha sonra tekrar deneyin.');
                            }
                        }
                    }] : [])
                ]
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Yetki kontrolü
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.BUSINESS_ADMIN) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>
                    Bu sayfaya erişim izniniz yok
                </Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.title}>Yeni Anket Oluştur</Text>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.formContainer}>
                    <Text style={styles.label}>Anket Başlığı</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Anket başlığını girin"
                    />

                    <Text style={styles.label}>Anket Açıklaması</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Anket açıklamasını girin"
                        multiline
                        numberOfLines={4}
                    />

                    <Text style={styles.label}>Sorular</Text>
                    {questions.length === 0 ? (
                        <Text style={styles.noQuestionsText}>
                            Henüz soru eklenmedi
                        </Text>
                    ) : (
                        questions.map((question, index) => (
                            <View key={question.id} style={styles.questionCard}>
                                <Text style={styles.questionNumber}>Soru {index + 1}</Text>
                                <Text style={styles.questionText}>{question.text}</Text>
                                <Text style={styles.questionType}>
                                    Tip: {
                                        question.type === 'text' ? 'Metin' :
                                            question.type === 'rating' ? 'Derecelendirme' : 'Çoktan Seçmeli'
                                    }
                                </Text>

                                {question.type === 'multiple_choice' && question.options && (
                                    <View style={styles.optionsContainer}>
                                        <Text style={styles.optionsTitle}>Seçenekler:</Text>
                                        {question.options.map((option, optIndex) => (
                                            <Text key={optIndex} style={styles.optionItem}>
                                                • {option}
                                            </Text>
                                        ))}
                                    </View>
                                )}

                                <Text style={styles.requiredText}>
                                    {question.required ? 'Zorunlu' : 'İsteğe Bağlı'}
                                </Text>

                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removeQuestion(question.id)}
                                >
                                    <Text style={styles.removeButtonText}>Soruyu Sil</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.addButtonText}>+ Soru Ekle</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.createButton,
                            (isLoading || questions.length === 0) && styles.disabledButton
                        ]}
                        onPress={handleCreateSurvey}
                        disabled={isLoading || questions.length === 0}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.createButtonText}>Anketi Oluştur</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Yeni Soru Ekleme Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Yeni Soru Ekle</Text>

                        <Text style={styles.label}>Soru Metni</Text>
                        <TextInput
                            style={styles.input}
                            value={newQuestion.text}
                            onChangeText={(text) => setNewQuestion({ ...newQuestion, text })}
                            placeholder="Soruyu girin"
                        />

                        <Text style={styles.label}>Soru Tipi</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={newQuestion.type}
                                onValueChange={(itemValue: QuestionType) => {
                                    setNewQuestion({ ...newQuestion, type: itemValue });
                                    // Çoktan seçmeli dışında bir tip seçilirse seçenekleri temizle
                                    if (itemValue !== 'multiple_choice') {
                                        setOptions([]);
                                    }
                                }}
                            >
                                <Picker.Item label="Metin" value="text" />
                                <Picker.Item label="Derecelendirme (1-5)" value="rating" />
                                <Picker.Item label="Çoktan Seçmeli" value="multiple_choice" />
                            </Picker>
                        </View>

                        {/* Çoktan seçmeli sorular için seçenek ekleme */}
                        {newQuestion.type === 'multiple_choice' && (
                            <View style={styles.optionsSection}>
                                <Text style={styles.label}>Seçenekler</Text>

                                {options.map((option, index) => (
                                    <View key={index} style={styles.optionRow}>
                                        <Text style={styles.optionText}>{index + 1}. {option}</Text>
                                        <TouchableOpacity
                                            style={styles.removeOptionButton}
                                            onPress={() => removeOption(index)}
                                        >
                                            <Text style={styles.removeOptionText}>X</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                <View style={styles.addOptionContainer}>
                                    <TextInput
                                        style={styles.optionInput}
                                        value={optionText}
                                        onChangeText={setOptionText}
                                        placeholder="Seçenek ekle"
                                    />
                                    <TouchableOpacity
                                        style={styles.addOptionButton}
                                        onPress={addOption}
                                    >
                                        <Text style={styles.addOptionText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View style={styles.requireRow}>
                            <Text style={styles.label}>Zorunlu Soru</Text>
                            <TouchableOpacity
                                style={[
                                    styles.checkBox,
                                    newQuestion.required && styles.checkedBox
                                ]}
                                onPress={() => setNewQuestion({
                                    ...newQuestion,
                                    required: !newQuestion.required
                                })}
                            >
                                {newQuestion.required && <Text style={styles.checkMark}>✓</Text>}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtonsContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>İptal</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={addQuestion}
                            >
                                <Text style={styles.saveButtonText}>Soruyu Ekle</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center',
    },
    formContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        backgroundColor: '#f9f9f9',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    noQuestionsText: {
        textAlign: 'center',
        fontStyle: 'italic',
        color: '#999',
        marginVertical: 20,
    },
    questionCard: {
        backgroundColor: '#f0f8ff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e1e8ed',
    },
    questionNumber: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 8,
        color: '#1976d2',
    },
    questionText: {
        fontSize: 16,
        marginBottom: 8,
    },
    questionType: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    requiredText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginBottom: 8,
    },
    removeButton: {
        backgroundColor: '#ffebee',
        padding: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    removeButtonText: {
        color: '#d32f2f',
        fontWeight: '600',
    },
    addButton: {
        backgroundColor: '#e8f5e9',
        padding: 12,
        borderRadius: 8,
        marginVertical: 16,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#388e3c',
        fontWeight: '600',
        fontSize: 16,
    },
    createButton: {
        backgroundColor: '#3498db',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    createButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledButton: {
        backgroundColor: '#b0bec5',
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#d32f2f',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        maxHeight: '90%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: '#f9f9f9',
    },
    optionsSection: {
        marginBottom: 16,
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#f0f8ff',
        borderRadius: 4,
        marginBottom: 8,
    },
    optionText: {
        flex: 1,
    },
    removeOptionButton: {
        backgroundColor: '#ffebee',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeOptionText: {
        color: '#d32f2f',
        fontWeight: 'bold',
    },
    addOptionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    optionInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginRight: 8,
        backgroundColor: '#f9f9f9',
    },
    addOptionButton: {
        backgroundColor: '#e8f5e9',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addOptionText: {
        color: '#388e3c',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonText: {
        color: '#666',
    },
    saveButton: {
        backgroundColor: '#3498db',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    requireRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    checkBox: {
        width: 24,
        height: 24,
        borderWidth: 1,
        borderColor: '#3498db',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkedBox: {
        backgroundColor: '#3498db',
    },
    checkMark: {
        color: 'white',
        fontWeight: 'bold',
    },
    optionsContainer: {
        marginVertical: 8,
        padding: 8,
        backgroundColor: '#f9f9f9',
        borderRadius: 4,
    },
    optionsTitle: {
        fontWeight: '600',
        marginBottom: 4,
    },
    optionItem: {
        paddingVertical: 4,
    },
});

export default CreateSurveyScreen; 