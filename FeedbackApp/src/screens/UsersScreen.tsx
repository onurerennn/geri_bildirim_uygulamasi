import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import api from '../services/api';
import { UserRole } from '../types/UserRole';

interface User {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
}

const UsersScreen = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: UserRole.CUSTOMER,
    });
    const [formErrors, setFormErrors] = useState<Partial<{
        name: string;
        email: string;
        password: string;
    }>>({});
    const [showPassword, setShowPassword] = useState(false);

    // Auth context'ten token ve kullanıcı bilgisini al
    const { token, user } = useAuthContext();

    // Kullanıcı listesine erişim kontrolü
    useEffect(() => {
        if (user?.role !== UserRole.SUPER_ADMIN) {
            Alert.alert('Yetkisiz Erişim', 'Bu sayfaya erişim yetkiniz bulunmamaktadır.');
        }
    }, [user]);

    // Kullanıcıları yükle
    useEffect(() => {
        const loadUsers = async () => {
            if (!token || user?.role !== UserRole.SUPER_ADMIN) return;

            setIsLoading(true);
            try {
                // API'den kullanıcıları getir
                const data = await api.getUsers(token);
                setUsers(data);
                setError('');
            } catch (err) {
                console.error('Kullanıcı yükleme hatası:', err);
                setError('Kullanıcılar yüklenirken bir hata oluştu');
            } finally {
                setIsLoading(false);
            }
        };

        loadUsers();
    }, [token, user]);

    // Kullanıcı durumunu değiştir (aktif/pasif)
    const toggleUserStatus = (id: string, currentStatus: boolean) => {
        Alert.alert(
            'Durum Değiştir',
            `Kullanıcıyı ${currentStatus ? 'pasif' : 'aktif'} duruma getirmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Onayla',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            if (token) {
                                // API çağrısı ile kullanıcı durumunu güncelle
                                await api.updateUser(token, id, { isActive: !currentStatus });

                                // Başarılı olursa listeyi güncelle
                                setUsers(users.map(u =>
                                    u._id === id
                                        ? { ...u, isActive: !currentStatus }
                                        : u
                                ));
                            }
                        } catch (error) {
                            console.error('Kullanıcı durumu güncelleme hatası:', error);
                            Alert.alert('Hata', 'Kullanıcı durumu güncellenirken bir hata oluştu');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Kullanıcı silme işlemi 
    const deleteUser = (id: string) => {
        Alert.alert(
            'Kullanıcı Sil',
            'Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            if (token) {
                                // API çağrısı ile kullanıcıyı sil
                                await api.deleteUser(token, id);

                                // Başarılı olursa listeden kaldır
                                setUsers(users.filter(u => u._id !== id));
                                Alert.alert('Başarılı', 'Kullanıcı başarıyla silindi');
                            }
                        } catch (error) {
                            console.error('Kullanıcı silme hatası:', error);
                            Alert.alert('Hata', 'Kullanıcı silinirken bir hata oluştu');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Arama işlevi
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Rol adını gösterme yardımcı fonksiyonu
    const getRoleName = (role: UserRole) => {
        switch (role) {
            case UserRole.SUPER_ADMIN:
                return 'Süper Admin';
            case UserRole.BUSINESS_ADMIN:
                return 'İşletme Yöneticisi';
            case UserRole.CUSTOMER:
                return 'Müşteri';
            default:
                return 'Bilinmiyor';
        }
    };

    // Rol rengini belirleme
    const getRoleColor = (role: UserRole) => {
        switch (role) {
            case UserRole.SUPER_ADMIN:
                return '#8e44ad'; // Mor
            case UserRole.BUSINESS_ADMIN:
                return '#2980b9'; // Mavi
            case UserRole.CUSTOMER:
                return '#27ae60'; // Yeşil
            default:
                return '#7f8c8d'; // Gri
        }
    };

    // Kullanıcı kartı bileşeni
    const renderUserItem = ({ item }: { item: User }) => (
        <View style={styles.userCard}>
            <View style={styles.userHeader}>
                <Text style={styles.userName}>{item.name}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.isActive ? '#e3f2fd' : '#ffebee' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.isActive ? '#1976d2' : '#d32f2f' }
                    ]}>
                        {item.isActive ? 'Aktif' : 'Pasif'}
                    </Text>
                </View>
            </View>

            <View style={styles.userDetails}>
                <View style={styles.detailItem}>
                    <Ionicons name="mail" size={16} color="#7f8c8d" />
                    <Text style={styles.detailText}>{item.email}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="person" size={16} color="#7f8c8d" />
                    <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(item.role)}20` }]}>
                        <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                            {getRoleName(item.role)}
                        </Text>
                    </View>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="calendar" size={16} color="#7f8c8d" />
                    <Text style={styles.detailText}>
                        {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                    </Text>
                </View>
            </View>

            <View style={styles.userActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                        // Kullanıcı düzenleme sayfasına git
                        Alert.alert('Bilgi', 'Düzenleme ekranı henüz eklenmedi');
                    }}
                >
                    <Ionicons name="pencil" size={16} color="#3498db" />
                    <Text style={styles.actionText}>Düzenle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => toggleUserStatus(item._id, item.isActive)}
                >
                    <Ionicons name={item.isActive ? "close-circle" : "checkmark-circle"} size={16} color={item.isActive ? "#e74c3c" : "#2ecc71"} />
                    <Text style={styles.actionText}>{item.isActive ? 'Pasif Yap' : 'Aktif Yap'}</Text>
                </TouchableOpacity>

                {/* Admin kendisini silemesin */}
                {user?._id !== item._id && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => deleteUser(item._id)}
                    >
                        <Ionicons name="trash" size={16} color="#e74c3c" />
                        <Text style={styles.actionText}>Sil</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    // Form veri değişikliği
    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Eğer alan daha önce hata içeriyorsa ve şimdi değer girilmişse hatayı temizle
        if (formErrors[field as keyof typeof formErrors] && value.trim()) {
            setFormErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    // Form doğrulama
    const validateForm = (): boolean => {
        const errors: Partial<{
            name: string;
            email: string;
            password: string;
        }> = {};

        if (!formData.name.trim()) errors.name = 'İsim zorunludur';
        if (!formData.email.trim()) {
            errors.email = 'E-posta zorunludur';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Geçerli bir e-posta adresi giriniz';
        }

        if (!formData.password.trim()) {
            errors.password = 'Şifre zorunludur';
        } else if (formData.password.length < 6) {
            errors.password = 'Şifre en az 6 karakter olmalıdır';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Kullanıcı rolünü değiştir
    const handleRoleChange = (role: UserRole) => {
        setFormData(prev => ({
            ...prev,
            role
        }));
    };

    // Yeni kullanıcı ekleme
    const handleAddUser = async () => {
        if (!validateForm()) return;

        try {
            setIsLoading(true);
            if (token) {
                // API çağrısı ile kullanıcı oluştur
                const newUser = await api.createUser(token, formData);
                console.log('Yeni kullanıcı oluşturuldu:', newUser);

                // Listeye ekle
                setUsers(prevUsers => [newUser, ...prevUsers]);

                // Formu temizle ve modalı kapat
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: UserRole.CUSTOMER
                });
                setModalVisible(false);

                Alert.alert('Başarılı', 'Kullanıcı başarıyla oluşturuldu');
            }
        } catch (error: any) {
            console.error('Kullanıcı oluşturma hatası:', error);
            Alert.alert('Hata', error.message || 'Kullanıcı oluşturulurken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    // Güçlü şifre oluştur
    const generateStrongPassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        handleInputChange('password', password);
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
                <View style={styles.searchContainer}>
                    <Ionicons
                        name="search"
                        size={20}
                        color="#7f8c8d"
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Kullanıcı ara..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {isLoading && !users.length ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#3498db" />
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
                        </View>
                    }
                />
            )}

            {/* Yeni kullanıcı ekleme modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Yeni Kullanıcı Ekle</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#7f8c8d" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formContainer}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>İsim Soyisim</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="İsim Soyisim"
                                    value={formData.name}
                                    onChangeText={value => handleInputChange('name', value)}
                                />
                                {formErrors.name && (
                                    <Text style={styles.errorText}>{formErrors.name}</Text>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>E-posta</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="E-posta adresi"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={formData.email}
                                    onChangeText={value => handleInputChange('email', value)}
                                />
                                {formErrors.email && (
                                    <Text style={styles.errorText}>{formErrors.email}</Text>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Şifre</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Şifre"
                                        secureTextEntry={!showPassword}
                                        value={formData.password}
                                        onChangeText={value => handleInputChange('password', value)}
                                    />
                                    <TouchableOpacity
                                        style={styles.passwordIcon}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-off" : "eye"}
                                            size={22}
                                            color="#7f8c8d"
                                        />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    style={styles.generateButton}
                                    onPress={generateStrongPassword}
                                >
                                    <Text style={styles.generateButtonText}>Güçlü Şifre Oluştur</Text>
                                </TouchableOpacity>
                                {formErrors.password && (
                                    <Text style={styles.errorText}>{formErrors.password}</Text>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Kullanıcı Rolü</Text>
                                <View style={styles.roleContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.roleButton,
                                            formData.role === UserRole.SUPER_ADMIN && styles.roleButtonActive
                                        ]}
                                        onPress={() => handleRoleChange(UserRole.SUPER_ADMIN)}
                                    >
                                        <Text
                                            style={[
                                                styles.roleButtonText,
                                                formData.role === UserRole.SUPER_ADMIN && styles.roleButtonTextActive
                                            ]}
                                        >
                                            Süper Admin
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.roleButton,
                                            formData.role === UserRole.BUSINESS_ADMIN && styles.roleButtonActive
                                        ]}
                                        onPress={() => handleRoleChange(UserRole.BUSINESS_ADMIN)}
                                    >
                                        <Text
                                            style={[
                                                styles.roleButtonText,
                                                formData.role === UserRole.BUSINESS_ADMIN && styles.roleButtonTextActive
                                            ]}
                                        >
                                            İşletme Yöneticisi
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.roleButton,
                                            formData.role === UserRole.CUSTOMER && styles.roleButtonActive
                                        ]}
                                        onPress={() => handleRoleChange(UserRole.CUSTOMER)}
                                    >
                                        <Text
                                            style={[
                                                styles.roleButtonText,
                                                formData.role === UserRole.CUSTOMER && styles.roleButtonTextActive
                                            ]}
                                        >
                                            Müşteri
                                        </Text>
                                    </TouchableOpacity>
                                </View>
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
                                onPress={handleAddUser}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
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
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    unauthorizedText: {
        fontSize: 16,
        color: '#e74c3c',
        marginTop: 16,
        textAlign: 'center',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 12,
        marginTop: 4,
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
    emptyText: {
        color: '#7f8c8d',
        fontSize: 16,
        textAlign: 'center',
    },
    listContainer: {
        padding: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        margin: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#34495e',
    },
    formContainer: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 6,
    },
    formInput: {
        backgroundColor: '#f5f5f5',
        padding: 10,
        borderRadius: 8,
        fontSize: 16,
        color: '#34495e',
    },
    passwordContainer: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    passwordInput: {
        flex: 1,
        padding: 10,
        fontSize: 16,
        color: '#34495e',
    },
    passwordIcon: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    generateButton: {
        backgroundColor: '#ecf0f1',
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
        alignItems: 'center',
    },
    generateButtonText: {
        color: '#3498db',
        fontSize: 14,
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    roleButton: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        flex: 1,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    roleButtonActive: {
        borderColor: '#3498db',
        backgroundColor: '#ecf0f1',
    },
    roleButtonText: {
        color: '#7f8c8d',
        fontSize: 12,
    },
    roleButtonTextActive: {
        color: '#3498db',
        fontWeight: 'bold',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#ecf0f1',
        justifyContent: 'flex-end',
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#ecf0f1',
        marginRight: 8,
    },
    submitButton: {
        backgroundColor: '#3498db',
    },
    buttonText: {
        fontWeight: 'bold',
        color: '#34495e',
    },
    userCard: {
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
    userHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userName: {
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
    userDetails: {
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
    roleBadge: {
        marginLeft: 8,
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    userActions: {
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
});

export default UsersScreen; 