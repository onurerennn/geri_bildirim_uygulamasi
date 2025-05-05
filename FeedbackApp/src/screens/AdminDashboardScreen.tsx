import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import api from '../services/api';
import { UserRole } from '../types/UserRole';

// StatsCard için prop tipleri
interface StatsCardProps {
    title: string;
    value: number;
    icon: any; // Ionicons için
    color: string;
}

// İstatistikler için tip tanımı
interface DashboardStats {
    totalSurveys: number;
    activeSurveys: number;
    totalResponses: number;
    totalUsers?: number;
    totalBusinesses?: number;
}

// İşletme form veri tipi
interface BusinessFormData {
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    password: string;
}

// Basit istatistik kartı bileşeni
const StatsCard = ({ title, value, icon, color }: StatsCardProps) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
        <View style={styles.statsIconContainer}>
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.statsContent}>
            <Text style={styles.statsTitle}>{title}</Text>
            <Text style={styles.statsValue}>{value}</Text>
        </View>
    </View>
);

const AdminDashboardScreen = ({ navigation }: any) => {
    const [stats, setStats] = useState<DashboardStats>({
        totalSurveys: 0,
        activeSurveys: 0,
        totalResponses: 0,
        totalUsers: 0,
        totalBusinesses: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [showBusinessModal, setShowBusinessModal] = useState(false);
    const [businessFormData, setBusinessFormData] = useState<BusinessFormData>({
        name: '',
        address: '',
        phone: '',
        email: '',
        description: '',
        password: ''
    });
    const [formErrors, setFormErrors] = useState<Partial<BusinessFormData>>({});
    const [showPassword, setShowPassword] = useState(false);

    // Auth context'ten kullanıcı ve token bilgisini al
    const { user, token, logout } = useAuthContext();

    // İstatistikleri yükle
    useEffect(() => {
        const loadStats = async () => {
            if (!token) return;

            setIsLoading(true);
            setError('');

            try {
                // API'den istatistikleri getir
                try {
                    const data = await api.getDashboardStats(token);
                    setStats(data);
                } catch (apiError: any) {
                    console.error('İstatistik API hatası:', apiError);
                    // Gerçek veri yerine dummy veri kullanmıyoruz, boş istatistikler gösteriyoruz
                    setStats({
                        totalSurveys: 0,
                        activeSurveys: 0,
                        totalResponses: 0,
                        totalUsers: user?.role === UserRole.SUPER_ADMIN ? 0 : undefined,
                        totalBusinesses: user?.role === UserRole.SUPER_ADMIN ? 0 : undefined
                    });

                    if (user?.role === UserRole.SUPER_ADMIN) {
                        // Sadece hata durumunda kullanıcıya bildirim göster
                        if (!error) {
                            setError('İstatistikler yüklenirken bir hata oluştu. Verileri yenilemek için sayfayı çekin.');
                        }
                    }
                }
            } catch (err) {
                console.error('İstatistik genel yükleme hatası:', err);
                setError('İstatistikler yüklenirken bir hata oluştu');
            } finally {
                setIsLoading(false);
            }
        };

        loadStats();
    }, [token, user]);

    // İşletmeleri yükle
    useEffect(() => {
        if (user?.role === UserRole.SUPER_ADMIN && token) {
            loadBusinesses();
        }
    }, [token, user]);

    // İşletmeleri yükle
    const loadBusinesses = async () => {
        try {
            if (token) {
                try {
                    const response = await api.getBusinesses(token);
                    if (Array.isArray(response) && response.length >= 0) {
                        console.log(`İşletmeler başarıyla alındı (${response.length} adet)`);
                        setBusinesses(response);
                    } else {
                        console.warn('İşletme verisi boş veya dizi değil:', response);
                        setBusinesses([]); // Boş dizi ile başlat
                    }
                } catch (apiError: any) {
                    console.error('İşletme yükleme API hatası:', apiError);
                    if (apiError.response) {
                        console.error('API Yanıt Kodu:', apiError.response.status);
                        console.error('API Yanıt Verisi:', apiError.response.data);
                    }

                    // Hata durumunda da boş dizi kullan, dummy veri kullanmıyoruz
                    setBusinesses([]);
                }
            }
        } catch (err) {
            console.error('İşletme listesi yüklenirken hata:', err);
            setBusinesses([]);
        }
    };

    // Hızlı erişim butonuna tıklandığında
    const handleQuickActionPress = (action: string) => {
        if (action === 'Yeni İşletme') {
            resetBusinessForm();
            setShowBusinessModal(true);
        } else {
            Alert.alert('Bilgi', `${action} ekranı henüz eklenmedi`);
        }
    };

    // Form resetleme
    const resetBusinessForm = () => {
        setBusinessFormData({
            name: '',
            address: '',
            phone: '',
            email: '',
            description: '',
            password: ''
        });
        setFormErrors({});
    };

    // Form doğrulama
    const validateForm = () => {
        const errors: Partial<BusinessFormData> = {};
        let isValid = true;

        if (!businessFormData.name.trim()) {
            errors.name = 'İşletme adı zorunludur';
            isValid = false;
        }

        if (!businessFormData.address.trim()) {
            errors.address = 'Adres zorunludur';
            isValid = false;
        }

        if (!businessFormData.phone.trim()) {
            errors.phone = 'Telefon numarası zorunludur';
            isValid = false;
        }

        if (!businessFormData.email.trim()) {
            errors.email = 'E-posta zorunludur';
            isValid = false;
        } else if (!/^\S+@\S+\.\S+$/.test(businessFormData.email)) {
            errors.email = 'Geçerli bir e-posta adresi giriniz';
            isValid = false;
        }

        if (!businessFormData.password.trim()) {
            errors.password = 'Şifre zorunludur';
            isValid = false;
        } else if (businessFormData.password.length < 6) {
            errors.password = 'Şifre en az 6 karakter olmalıdır';
            isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    // Yeni işletme ekleme
    const handleAddBusiness = async () => {
        if (!validateForm()) return;

        try {
            setIsLoading(true);
            if (token) {
                // API'nin beklediği formatta veri gönder
                const businessData = {
                    name: businessFormData.name,
                    address: businessFormData.address,
                    phone: businessFormData.phone,
                    email: businessFormData.email,
                    description: businessFormData.description,
                    password: businessFormData.password,
                    isActive: true
                };

                // İşletme oluştur
                await api.createBusiness(token, businessData);

                // İşletme listesini yenile
                await loadBusinesses();

                // İstatistikleri yenile
                const data = await api.getDashboardStats(token);
                setStats(data);

                // Modalı kapat ve başarı mesajı göster
                setShowBusinessModal(false);
                Alert.alert('Başarılı', 'İşletme başarıyla oluşturuldu');
            }
        } catch (err: any) {
            console.error('İşletme oluşturma hatası:', err);
            Alert.alert('Hata', err?.message || 'İşletme oluşturulurken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    // Kullanıcı çıkış işlemi
    const handleLogout = () => {
        Alert.alert(
            "Çıkış",
            "Hesabınızdan çıkış yapmak istiyor musunuz?",
            [
                {
                    text: "İptal",
                    style: "cancel"
                },
                {
                    text: "Çıkış Yap",
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
        setBusinessFormData({
            ...businessFormData,
            password: password
        });
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

                                // İstatistikleri güncelle
                                loadStats();
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

    // İstatistikleri yeniden yükle
    const loadStats = async () => {
        if (!token) return;

        try {
            const data = await api.getDashboardStats(token);
            setStats(data);
        } catch (err) {
            console.error('İstatistik yükleme hatası:', err);
        }
    };

    // İçerik yükleniyor göstergesi
    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3498db" />
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
                        // Verileri tekrar yüklemeyi tetiklemek için state'i güncelle
                    }}
                >
                    <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Merhaba, {user?.name || 'Kullanıcı'}</Text>
                <Text style={styles.subGreeting}>
                    {user?.role === UserRole.SUPER_ADMIN
                        ? 'Süper Yönetici Paneli'
                        : 'İşletme Yönetici Paneli'}
                </Text>
            </View>

            <View style={styles.statsContainer}>
                <StatsCard
                    title="Toplam Anket"
                    value={stats.totalSurveys}
                    icon="document-text"
                    color="#3498db"
                />
                <StatsCard
                    title="Aktif Anket"
                    value={stats.activeSurveys}
                    icon="checkmark-circle"
                    color="#2ecc71"
                />
                <StatsCard
                    title="Toplam Yanıt"
                    value={stats.totalResponses}
                    icon="chatbubbles"
                    color="#f39c12"
                />

                {/* Sadece Süper Admin için ek istatistikler */}
                {user?.role === UserRole.SUPER_ADMIN && stats.totalUsers !== undefined && (
                    <StatsCard
                        title="Toplam Kullanıcı"
                        value={stats.totalUsers}
                        icon="people"
                        color="#9b59b6"
                    />
                )}

                {user?.role === UserRole.SUPER_ADMIN && stats.totalBusinesses !== undefined && (
                    <StatsCard
                        title="Toplam İşletme"
                        value={stats.totalBusinesses}
                        icon="business"
                        color="#34495e"
                    />
                )}
            </View>

            {/* Hızlı Erişim Butonları */}
            <View style={styles.quickActionsContainer}>
                <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
                <View style={styles.quickActionsGrid}>
                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleQuickActionPress('Yeni Anket')}
                    >
                        <Ionicons name="add-circle" size={24} color="#3498db" />
                        <Text style={styles.quickActionText}>Yeni Anket</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleQuickActionPress('Raporlar')}
                    >
                        <Ionicons name="analytics" size={24} color="#f39c12" />
                        <Text style={styles.quickActionText}>Raporlar</Text>
                    </TouchableOpacity>

                    {user?.role === UserRole.SUPER_ADMIN ? (
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => handleQuickActionPress('Yeni İşletme')}
                        >
                            <Ionicons name="business-outline" size={24} color="#9b59b6" />
                            <Text style={styles.quickActionText}>Yeni İşletme</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => handleQuickActionPress('QR Kodlar')}
                        >
                            <Ionicons name="qr-code" size={24} color="#2ecc71" />
                            <Text style={styles.quickActionText}>QR Kodlar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Admin Özel Butonlar */}
            {user?.role === UserRole.SUPER_ADMIN && (
                <View style={styles.adminActionsContainer}>
                    <Text style={styles.sectionTitle}>Yönetim İşlemleri</Text>
                    <View style={styles.adminButtonsContainer}>
                        <TouchableOpacity
                            style={styles.adminButton}
                            onPress={() => navigation.navigate('Businesses')}
                        >
                            <Ionicons name="business" size={24} color="white" style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>İşletmeleri Yönet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.adminButton, { backgroundColor: '#9b59b6' }]}
                            onPress={() => navigation.navigate('Users')}
                        >
                            <Ionicons name="people" size={24} color="white" style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Kullanıcıları Yönet</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Son Anketler veya İstatistikler eklenebilir */}
            {user?.role === UserRole.SUPER_ADMIN && (
                <>
                    <View style={styles.recentContainer}>
                        <Text style={styles.sectionTitle}>Sistem Durumu</Text>
                        <View style={styles.recentItem}>
                            <Ionicons name="checkmark-circle" size={24} color="#2ecc71" style={styles.recentIcon} />
                            <View style={styles.recentContent}>
                                <Text style={styles.recentTitle}>Sistem Aktif</Text>
                                <Text style={styles.recentDescription}>Tüm servisler çalışıyor</Text>
                            </View>
                        </View>
                    </View>

                    {/* İşletme Listesi */}
                    <View style={styles.businessesContainer}>
                        <View style={styles.businessesHeader}>
                            <Text style={styles.sectionTitle}>İşletmeler</Text>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={() => loadBusinesses()}
                            >
                                <Ionicons name="refresh" size={20} color="#3498db" />
                            </TouchableOpacity>
                        </View>

                        {businesses.length === 0 ? (
                            <View style={styles.emptyBusinessContainer}>
                                <Ionicons name="business" size={32} color="#bdc3c7" />
                                <Text style={styles.emptyBusinessText}>Henüz işletme bulunmuyor</Text>
                            </View>
                        ) : (
                            <View>
                                {businesses.slice(0, 3).map((business: any) => (
                                    <View key={business._id} style={styles.businessCard}>
                                        <View style={styles.businessCardHeader}>
                                            <Text style={styles.businessName}>{business.name}</Text>
                                            <View style={[
                                                styles.statusBadge,
                                                { backgroundColor: business.isActive ? '#e3f2fd' : '#ffebee' }
                                            ]}>
                                                <Text style={[
                                                    styles.statusText,
                                                    { color: business.isActive ? '#1976d2' : '#d32f2f' }
                                                ]}>
                                                    {business.isActive ? 'Aktif' : 'Pasif'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.businessInfo}>
                                            <Text style={styles.businessInfoText} numberOfLines={1}>
                                                <Ionicons name="mail" size={14} color="#7f8c8d" /> {business.email}
                                            </Text>
                                            <Text style={styles.businessInfoText} numberOfLines={1}>
                                                <Ionicons name="call" size={14} color="#7f8c8d" /> {business.phone}
                                            </Text>
                                        </View>

                                        <View style={styles.businessActions}>
                                            <TouchableOpacity
                                                style={styles.businessActionButton}
                                                onPress={() => handleDeleteBusiness(business._id)}
                                            >
                                                <Ionicons name="trash" size={18} color="#e74c3c" />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.businessActionButton}
                                                onPress={() => navigation.navigate('BusinessScreen')}
                                            >
                                                <Ionicons name="create" size={18} color="#3498db" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}

                                {businesses.length > 3 && (
                                    <TouchableOpacity
                                        style={styles.viewAllButton}
                                        onPress={() => navigation.navigate('BusinessScreen')}
                                    >
                                        <Text style={styles.viewAllText}>Tümünü Görüntüle ({businesses.length})</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#3498db" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>

                    {/* İşletme yönetim butonları */}
                    <View style={styles.businessActionButtonsContainer}>
                        <TouchableOpacity
                            style={styles.businessFullButton}
                            onPress={() => {
                                // İşletme yönetim ekranını aç
                                navigation.navigate('BusinessScreen');
                            }}
                        >
                            <Ionicons name="business" size={22} color="white" style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>İşletme Yönetimini Aç</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.businessFullButton, { backgroundColor: '#2ecc71' }]}
                            onPress={() => {
                                resetBusinessForm();
                                generateStrongPassword();
                                setShowBusinessModal(true);
                            }}
                        >
                            <Ionicons name="add-circle" size={22} color="white" style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Yeni İşletme Ekle</Text>
                        </TouchableOpacity>
                    </View>

                    {/* İşletmelerin tümünü görüntüle butonu - Mobil için kullanışlı bir kısayol */}
                    {businesses.length > 0 && (
                        <TouchableOpacity
                            style={styles.allBusinessButton}
                            onPress={() => navigation.navigate('BusinessScreen')}
                        >
                            <Text style={styles.allBusinessText}>Tüm İşletmeleri Görüntüle ({businesses.length})</Text>
                            <Ionicons name="chevron-forward-outline" size={18} color="#3498db" />
                        </TouchableOpacity>
                    )}
                </>
            )}

            {/* Çıkış Butonu */}
            <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
            >
                <Ionicons name="log-out-outline" size={24} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Çıkış Yap</Text>
            </TouchableOpacity>

            {/* İşletme Ekleme Modal */}
            <Modal
                visible={showBusinessModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowBusinessModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Yeni İşletme Ekle</Text>
                            <TouchableOpacity onPress={() => setShowBusinessModal(false)}>
                                <Ionicons name="close" size={24} color="#34495e" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formScrollView}>
                            <Text style={styles.modalSubTitle}>
                                İşletme bilgilerini girin. Tüm alanlar zorunludur.
                            </Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>İşletme Adı *</Text>
                                <TextInput
                                    style={[styles.formInput, formErrors.name ? styles.inputError : null]}
                                    value={businessFormData.name}
                                    onChangeText={(text) => setBusinessFormData({ ...businessFormData, name: text })}
                                    placeholder="İşletme adı giriniz"
                                />
                                {formErrors.name && <Text style={styles.errorMessage}>{formErrors.name}</Text>}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Adres *</Text>
                                <TextInput
                                    style={[styles.formInput, formErrors.address ? styles.inputError : null]}
                                    value={businessFormData.address}
                                    onChangeText={(text) => setBusinessFormData({ ...businessFormData, address: text })}
                                    placeholder="İşletme adresini giriniz"
                                    multiline
                                />
                                {formErrors.address && <Text style={styles.errorMessage}>{formErrors.address}</Text>}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Telefon *</Text>
                                <TextInput
                                    style={[styles.formInput, formErrors.phone ? styles.inputError : null]}
                                    value={businessFormData.phone}
                                    onChangeText={(text) => setBusinessFormData({ ...businessFormData, phone: text })}
                                    placeholder="Telefon numarası giriniz"
                                    keyboardType="phone-pad"
                                />
                                {formErrors.phone && <Text style={styles.errorMessage}>{formErrors.phone}</Text>}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>E-posta *</Text>
                                <TextInput
                                    style={[styles.formInput, formErrors.email ? styles.inputError : null]}
                                    value={businessFormData.email}
                                    onChangeText={(text) => setBusinessFormData({ ...businessFormData, email: text })}
                                    placeholder="E-posta adresi giriniz"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                {formErrors.email && <Text style={styles.errorMessage}>{formErrors.email}</Text>}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Açıklama</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={businessFormData.description}
                                    onChangeText={(text) => setBusinessFormData({ ...businessFormData, description: text })}
                                    placeholder="İşletme açıklaması giriniz (opsiyonel)"
                                    multiline
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Admin Şifresi *</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[styles.passwordInput, formErrors.password ? styles.inputError : null]}
                                        value={businessFormData.password}
                                        onChangeText={(text) => setBusinessFormData({ ...businessFormData, password: text })}
                                        placeholder="Admin için şifre oluşturun"
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
                                {formErrors.password && <Text style={styles.errorMessage}>{formErrors.password}</Text>}
                                <View style={styles.passwordHelper}>
                                    <Text style={styles.helperText}>
                                        Bu şifre, işletme yöneticisi olarak giriş yapabilmek için kullanılacaktır.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.generateButton}
                                        onPress={generateStrongPassword}
                                    >
                                        <Text style={styles.generateButtonText}>Güçlü Şifre Oluştur</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.formActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setShowBusinessModal(false)}
                                >
                                    <Text style={styles.buttonText}>İptal</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.saveButton}
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
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
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
        padding: 20,
        backgroundColor: '#3498db',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    subGreeting: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    statsContainer: {
        padding: 16,
    },
    statsCard: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        borderLeftWidth: 6
    },
    statsIconContainer: {
        marginRight: 16,
        justifyContent: 'center',
    },
    statsContent: {
        flex: 1,
    },
    statsTitle: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    statsValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    errorMessage: {
        color: '#e74c3c',
        fontSize: 12,
        marginTop: 4,
    },
    retryButton: {
        backgroundColor: '#3498db',
        padding: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    quickActionsContainer: {
        padding: 16,
    },
    adminActionsContainer: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#2c3e50',
    },
    quickActionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    quickActionButton: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 10,
        width: '30%',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    quickActionText: {
        fontSize: 12,
        marginTop: 8,
        color: '#34495e',
        fontWeight: '500',
        textAlign: 'center',
    },
    recentContainer: {
        padding: 16,
    },
    recentItem: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 10,
        flexDirection: 'row',
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    recentIcon: {
        marginRight: 12,
    },
    recentContent: {
        flex: 1,
    },
    recentTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 4,
    },
    recentDescription: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    logoutButton: {
        backgroundColor: '#e74c3c',
        padding: 16,
        borderRadius: 10,
        margin: 16,
        marginTop: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    buttonIcon: {
        marginRight: 5,
    },
    adminButtonsContainer: {
        gap: 12,
    },
    adminButton: {
        backgroundColor: '#3498db',
        padding: 16,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        maxHeight: '90%',
        width: '100%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    modalSubTitle: {
        fontSize: 14,
        color: '#7f8c8d',
        marginVertical: 8,
    },
    formScrollView: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#34495e',
        marginBottom: 8,
    },
    formInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    inputError: {
        borderColor: '#e74c3c',
    },
    helperText: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 4,
    },
    formActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: '#2ecc71',
        padding: 16,
        borderRadius: 8,
        flex: 1,
        marginLeft: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#e74c3c',
        padding: 16,
        borderRadius: 8,
        flex: 1,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    businessesContainer: {
        padding: 16,
    },
    businessesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    refreshButton: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    emptyBusinessContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyBusinessText: {
        color: '#7f8c8d',
        fontSize: 16,
        marginTop: 12,
    },
    businessCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 10,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    businessCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    businessName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    statusBadge: {
        padding: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    businessInfo: {
        marginBottom: 8,
    },
    businessInfoText: {
        color: '#7f8c8d',
    },
    businessActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    businessActionButton: {
        padding: 4,
    },
    viewAllButton: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    viewAllText: {
        fontSize: 12,
        marginRight: 8,
        color: '#3498db',
        fontWeight: '500',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#f9f9f9',
    },
    passwordInput: {
        flex: 1,
        padding: 0,
        fontSize: 16,
    },
    passwordToggle: {
        padding: 4,
    },
    passwordHelper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    generateButton: {
        backgroundColor: '#3498db',
        padding: 8,
        borderRadius: 4,
    },
    generateButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    businessActionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginTop: 16,
        marginBottom: 32,
    },
    businessFullButton: {
        flex: 1,
        backgroundColor: '#3498db',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
        flexDirection: 'row',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    allBusinessButton: {
        backgroundColor: 'white',
        padding: 14,
        borderRadius: 10,
        marginHorizontal: 16,
        marginTop: 0,
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    allBusinessText: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '500',
        marginRight: 8,
    },
});

export default AdminDashboardScreen; 