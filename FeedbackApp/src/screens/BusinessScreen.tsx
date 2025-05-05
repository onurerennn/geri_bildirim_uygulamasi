import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    FlatList,
    Modal,
    TextInput,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import api from '../services/api';
// @ts-ignore
import { StackNavigationProp } from '@react-navigation/stack';
import { UserRole } from '../types/UserRole';
import * as Clipboard from 'expo-clipboard';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import CommonBackground from '../components/CommonBackground';
import CategoryChart from '../components/CategoryChart';
import UserSurveyComponent from '../components/UserSurveyComponent';
import UserActivityComponent from '../components/UserActivityComponent';
import SurveyResponsesComponent from '../components/SurveyResponsesComponent';
import RecentSurveysComponent from '../components/RecentSurveysComponent';
import UserCountComponent from '../components/UserCountComponent';

interface Business {
    _id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
    email: string;
}

// İşletme formu için veri yapısı
interface BusinessFormData {
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    password: string;
}

// BusinessScreen props tipi
interface BusinessScreenProps {
    navigation: StackNavigationProp<any>;
}

const BusinessScreen: React.FC<BusinessScreenProps> = ({ navigation }) => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState<BusinessFormData>({
        name: '',
        address: '',
        phone: '',
        email: '',
        description: '',
        password: ''
    });
    const [formErrors, setFormErrors] = useState<Partial<BusinessFormData>>({});

    // Auth context'ten token ve kullanıcı bilgisini al
    const { token, user, logout } = useAuthContext();

    // İşletme listesine erişim kontrolü
    useEffect(() => {
        if (user?.role !== UserRole.SUPER_ADMIN) {
            Alert.alert('Yetkisiz Erişim', 'Bu sayfaya erişim yetkiniz bulunmamaktadır.');
        }
    }, [user]);

    // İşletmeleri yükle
    useEffect(() => {
        loadBusinesses();
    }, [token, user]);

    // İşletmeleri yükleme fonksiyonu
    const loadBusinesses = async (clearCache = false) => {
        if (!token || user?.role !== UserRole.SUPER_ADMIN) return;

        setIsLoading(true);
        setError('');
        try {
            // API'den işletmeleri getir
            console.log('İşletmeleri yükleme isteği gönderiliyor...');

            // Önbellek temizleme parametresi eklendiğinde bu bilgiyi loglayalım
            if (clearCache) {
                console.log('Önbellek temizleme istenmiş, tamamen yeni veri alınacak');
            }

            // API çağrısı
            try {
                const data = await api.getBusinesses(token);
                if (Array.isArray(data) && data.length >= 0) {
                    console.log(`İşletmeler başarıyla alındı (${data.length} adet)`);
                    setBusinesses(data);
                    setIsLoading(false);
                    return;
                } else {
                    console.warn('İşletme verisi boş veya dizi değil:', data);
                }
            } catch (apiError: any) {
                console.error('İşletme yükleme API hatası:', apiError);
                if (apiError.response) {
                    console.error('API Yanıt Kodu:', apiError.response.status);
                    console.error('API Yanıt Verisi:', apiError.response.data);
                }
                setError('İşletmeler yüklenirken hata oluştu: ' + (apiError.message || 'Bilinmeyen hata'));
            }

            // Direkt endpoint denemesi
            try {
                const response = await fetch(`${api.getApiUrl()}/api/businesses`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const businessList = Array.isArray(data) ? data : (data.data || []);
                    console.log(`Alternatif yöntemle ${businessList.length} işletme alındı`);
                    setBusinesses(businessList);
                    setIsLoading(false);
                    return;
                } else {
                    console.warn('Alternatif fetch yanıtı başarısız:', response.status);
                    setError(`Sunucu hatası: ${response.status} ${response.statusText}`);
                }
            } catch (fetchError: any) {
                console.warn('Alternatif fetch hatası:', fetchError);
                setError('Sunucu bağlantısı kurulamadı: ' + (fetchError.message || 'Bilinmeyen hata'));
            }

            setIsLoading(false);
        } catch (err) {
            console.error('İşletme yükleme genel hatası:', err);
            setError('İşletmeler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
            setIsLoading(false);
        }
    };

    // Form veri değişikliği
    const handleInputChange = (field: keyof BusinessFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Eğer alan daha önce hata içeriyorsa ve şimdi değer girilmişse hatayı temizle
        if (formErrors[field] && value.trim()) {
            setFormErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    // Form doğrulama
    const validateForm = (): boolean => {
        const errors: Partial<BusinessFormData> = {};

        if (!formData.name.trim()) errors.name = 'İşletme adı zorunludur';
        if (!formData.address.trim()) errors.address = 'Adres zorunludur';
        if (!formData.phone.trim()) errors.phone = 'Telefon zorunludur';

        // E-posta doğrulama
        if (!formData.email.trim()) {
            errors.email = 'E-posta zorunludur';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Geçerli bir e-posta adresi giriniz';
        }

        // Şifre doğrulama
        if (!formData.password.trim()) {
            errors.password = 'Şifre zorunludur';
        } else if (formData.password.length < 6) {
            errors.password = 'Şifre en az 6 karakter olmalıdır';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Yeni işletme ekleme
    const handleAddBusiness = async () => {
        if (!validateForm()) return;

        try {
            setIsLoading(true);
            if (token) {
                // API'nin beklediği formatta veri gönder
                const businessData = {
                    name: formData.name.trim(),
                    address: formData.address.trim(),
                    phone: formData.phone.trim(),
                    email: formData.email.trim().toLowerCase(),
                    description: formData.description.trim(),
                    password: formData.password.trim(),
                    isActive: true
                };

                console.log('Gönderilen işletme verisi (şifre hariç):', {
                    ...businessData,
                    password: '******'
                });

                // API çağrısını yap
                try {
                    const result = await api.createBusiness(token, businessData);
                    console.log('İşletme oluşturma sonucu:', result);

                    Alert.alert(
                        'Başarılı',
                        `İşletme başarıyla oluşturuldu.\n\nGiriş bilgileri:\nE-posta: ${businessData.email}\nŞifre: ${businessData.password}\n\nBu bilgileri not almayı unutmayın!`,
                        [
                            {
                                text: 'E-postayı Kopyala',
                                onPress: () => {
                                    Clipboard.setStringAsync(businessData.email);
                                    Alert.alert('Kopyalandı', 'E-posta panoya kopyalandı.');
                                }
                            },
                            {
                                text: 'Tamam',
                                onPress: () => {
                                    // Formu temizle ve modalı kapat
                                    setFormData({
                                        name: '',
                                        address: '',
                                        phone: '',
                                        email: '',
                                        description: '',
                                        password: ''
                                    });
                                    setModalVisible(false);

                                    // İşletme listesini yenile
                                    loadBusinesses(true);
                                }
                            }
                        ]
                    );
                } catch (apiError: any) {
                    // API hatası detaylı olarak göster
                    console.error('İşletme oluşturma API hatası:', apiError);

                    let errorMessage = apiError.message || 'İşletme oluşturulurken bir hata oluştu';
                    if (apiError.response && apiError.response.data) {
                        errorMessage = apiError.response.data.message || errorMessage;
                    }

                    Alert.alert('Hata', errorMessage);
                }
            }
        } catch (error: any) {
            console.error('Genel bir hata oluştu:', error);
            Alert.alert('Hata', 'İşlem sırasında beklenmeyen bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    // İşletme durumunu değiştir (aktif/pasif)
    const toggleBusinessStatus = (id: string, currentStatus: boolean) => {
        Alert.alert(
            'Durum Değiştir',
            `İşletmeyi ${currentStatus ? 'pasif' : 'aktif'} duruma getirmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Onayla',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            if (token) {
                                // API çağrısı ile işletme durumunu güncelle
                                await api.updateBusiness(token, id, { isActive: !currentStatus });

                                // Başarılı olursa listeyi güncelle
                                setBusinesses(businesses.map(business =>
                                    business._id === id
                                        ? { ...business, isActive: !currentStatus }
                                        : business
                                ));
                            }
                        } catch (error) {
                            console.error('İşletme durumu güncelleme hatası:', error);
                            Alert.alert('Hata', 'İşletme durumu güncellenirken bir hata oluştu');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // İşletme silme işlemi
    const handleDeleteBusiness = (id: string) => {
        Alert.alert(
            'İşletmeyi Sil',
            'Bu işletmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            if (token) {
                                // API çağrısı ile işletmeyi sil
                                const result = await api.deleteBusiness(token, id);
                                console.log('İşletme silme API sonucu:', result);

                                // UI'dan silinen işletmeyi kaldır
                                setBusinesses(businesses.filter(business => business._id !== id));

                                // Başarı mesajı göster
                                Alert.alert(
                                    'Başarılı',
                                    'İşletme başarıyla silindi.',
                                    [{ text: 'Tamam' }]
                                );
                            }
                        } catch (error: any) {
                            console.error('İşletme silme hatası:', error);

                            let errorMessage = 'İşletme silinirken bir hata oluştu';
                            if (error.response && error.response.data) {
                                errorMessage = error.response.data.message || errorMessage;
                            }

                            Alert.alert('Hata', errorMessage);
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Arama işlevi
    const filteredBusinesses = businesses.filter(business =>
        business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // İşletme kartı bileşeni
    const renderBusinessItem = ({ item }: { item: Business }) => (
        <View style={styles.businessCard}>
            <View style={styles.businessHeader}>
                <Text style={styles.businessName}>{item.name}</Text>
                <TouchableOpacity
                    style={[
                        styles.statusBadge,
                        { backgroundColor: item.isActive ? '#e3f2fd' : '#ffebee' }
                    ]}
                    onPress={() => toggleBusinessStatus(item._id, item.isActive)}
                >
                    <Text style={[
                        styles.statusText,
                        { color: item.isActive ? '#1976d2' : '#d32f2f' }
                    ]}>
                        {item.isActive ? 'Aktif' : 'Pasif'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.businessDetails}>
                <View style={styles.detailItem}>
                    <Ionicons name="location" size={16} color="#7f8c8d" />
                    <Text style={styles.detailText}>{item.address}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="call" size={16} color="#7f8c8d" />
                    <Text style={styles.detailText}>{item.phone}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="mail" size={16} color="#7f8c8d" />
                    <Text style={styles.detailText}>{item.email}</Text>
                </View>
            </View>

            <View style={styles.businessActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                        // İşletme düzenleme ekranına git
                        // navigation.navigate('EditBusiness', { businessId: item._id });
                        Alert.alert('Bilgi', 'Düzenleme ekranı henüz eklenmedi');
                    }}
                >
                    <Ionicons name="pencil" size={16} color="#3498db" />
                    <Text style={styles.actionText}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                        // İşletme detay ekranına git
                        // navigation.navigate('BusinessDetail', { businessId: item._id });
                        Alert.alert('Bilgi', 'Detay ekranı henüz eklenmedi');
                    }}
                >
                    <Ionicons name="eye" size={16} color="#2ecc71" />
                    <Text style={styles.actionText}>Detay</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteBusiness(item._id)}
                >
                    <Ionicons name="trash" size={16} color="#e74c3c" />
                    <Text style={styles.actionText}>Sil</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Rastgele güçlü şifre oluştur
    const generateStrongPassword = () => {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+=-';

        const allChars = lowercase + uppercase + numbers + symbols;
        let password = '';

        // En az bir karakter her gruptan ekle
        password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
        password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
        password += numbers.charAt(Math.floor(Math.random() * numbers.length));
        password += symbols.charAt(Math.floor(Math.random() * symbols.length));

        // Geri kalan 6 karakteri rastgele ekle (toplam 10 karakter)
        for (let i = 0; i < 6; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }

        // Karakterlerin sırasını karıştır
        password = password.split('').sort(() => 0.5 - Math.random()).join('');

        // Form state'ini güncelle
        handleInputChange('password', password);

        // Şifreyi göster
        setShowPassword(true);
    };

    // Kullanıcı çıkış işlemi
    const handleLogout = () => {
        Alert.alert(
            "Çıkış",
            "Hesabınızdan çıkış yapmak istiyor musunuz?",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Çıkış Yap",
                    style: "destructive",
                    onPress: () => {
                        logout(() => {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }]
                            });
                        });
                    }
                }
            ]
        );
    };

    // Yükleniyor göstergesi
    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    // Yetkisiz erişim
    if (user?.role !== UserRole.SUPER_ADMIN) {
        return (
            <View style={styles.centered}>
                <Ionicons name="lock-closed" size={64} color="#e74c3c" />
                <Text style={styles.unauthorizedText}>Bu sayfaya erişim yetkiniz bulunmamaktadır.</Text>
            </View>
        );
    }

    // Hata mesajı
    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                        setIsLoading(true);
                        setError('');
                    }}
                >
                    <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>İşletme Yönetimi</Text>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                </View>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="İşletme ara..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#95a5a6"
                    />
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* İşletme Listesi */}
            {filteredBusinesses.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="business" size={64} color="#bdc3c7" />
                    <Text style={styles.emptyText}>
                        {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz işletme bulunmuyor'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredBusinesses}
                    renderItem={renderBusinessItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshing={isLoading}
                    onRefresh={() => loadBusinesses(true)}
                />
            )}

            {/* Yeni İşletme Ekleme Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Yeni İşletme Ekle</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#34495e" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalSubHeader}>
                            <Text style={styles.modalSubTitle}>
                                İşletme bilgilerini girin. * işaretli alanlar zorunludur.
                            </Text>
                        </View>

                        <ScrollView style={styles.formContainer}>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>İşletme Adı *</Text>
                                <TextInput
                                    style={[styles.input, formErrors.name && styles.inputError]}
                                    value={formData.name}
                                    onChangeText={(value) => handleInputChange('name', value)}
                                    placeholder="İşletme adını giriniz"
                                />
                                {formErrors.name && (
                                    <Text style={styles.errorText}>{formErrors.name}</Text>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Adres *</Text>
                                <TextInput
                                    style={[styles.input, formErrors.address && styles.inputError]}
                                    value={formData.address}
                                    onChangeText={(value) => handleInputChange('address', value)}
                                    placeholder="İşletme adresini giriniz"
                                    multiline
                                />
                                {formErrors.address && (
                                    <Text style={styles.errorText}>{formErrors.address}</Text>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Telefon *</Text>
                                <TextInput
                                    style={[styles.input, formErrors.phone && styles.inputError]}
                                    value={formData.phone}
                                    onChangeText={(value) => handleInputChange('phone', value)}
                                    placeholder="İşletme telefonunu giriniz"
                                    keyboardType="phone-pad"
                                />
                                {formErrors.phone && (
                                    <Text style={styles.errorText}>{formErrors.phone}</Text>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>E-posta *</Text>
                                <TextInput
                                    style={[styles.input, formErrors.email && styles.inputError]}
                                    value={formData.email}
                                    onChangeText={(value) => handleInputChange('email', value)}
                                    placeholder="İşletme e-postasını giriniz"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                {formErrors.email && (
                                    <Text style={styles.errorText}>{formErrors.email}</Text>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Açıklama</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.description}
                                    onChangeText={(value) => handleInputChange('description', value)}
                                    placeholder="İşletme açıklaması giriniz"
                                    multiline
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>Şifre *</Text>
                                    <TouchableOpacity onPress={generateStrongPassword}>
                                        <Text style={styles.generateButton}>Güçlü Şifre Oluştur</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[styles.passwordInput, formErrors.password && styles.inputError]}
                                        value={formData.password}
                                        onChangeText={(value) => handleInputChange('password', value)}
                                        placeholder="İşletme şifresini giriniz"
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity
                                        style={styles.passwordToggle}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-off" : "eye"}
                                            size={22}
                                            color="#7f8c8d"
                                        />
                                    </TouchableOpacity>
                                </View>
                                {formErrors.password && (
                                    <Text style={styles.errorText}>{formErrors.password}</Text>
                                )}
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.submitButton]}
                                onPress={handleAddBusiness}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.buttonText}>Kaydet</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    logoutButton: {
        padding: 8,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginRight: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        color: '#34495e',
    },
    addButton: {
        backgroundColor: '#3498db',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 12,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#34495e',
    },
    modalSubHeader: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalSubTitle: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    formContainer: {
        padding: 16,
        maxHeight: '70%',
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        color: '#7f8c8d',
    },
    input: {
        borderWidth: 1,
        borderColor: '#dcdde1',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#2c3e50',
        backgroundColor: '#f9f9f9',
    },
    inputError: {
        borderColor: '#e74c3c',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 12,
        marginTop: 4,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#ecf0f1',
        marginRight: 8,
    },
    submitButton: {
        backgroundColor: '#3498db',
        marginLeft: 8,
    },
    buttonText: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#2c3e50',
    },
    listContainer: {
        padding: 16,
        paddingTop: 8,
    },
    businessCard: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    businessHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    businessName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    businessDetails: {
        marginBottom: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#34495e',
    },
    businessActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#ecf0f1',
        paddingTop: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 16,
    },
    actionText: {
        marginLeft: 4,
        fontSize: 14,
    },
    unauthorizedText: {
        fontSize: 16,
        color: '#e74c3c',
        marginTop: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#dcdde1',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
    },
    passwordInput: {
        flex: 1,
        fontSize: 16,
        color: '#2c3e50',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    passwordToggle: {
        padding: 8,
        marginRight: 4,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    generateButton: {
        fontSize: 12,
        color: '#3498db',
        fontWeight: 'bold',
    },
});

export default BusinessScreen; 