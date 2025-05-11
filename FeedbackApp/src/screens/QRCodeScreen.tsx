import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Share, Platform } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { StackNavigationProp } from '@react-navigation/stack';
import api from '../services/api';
import { useAuthContext } from '../context/AuthContext';
// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QRCode {
    _id: string;
    code: string;
    url: string;
    surveyTitle: string;
    description: string;
    location: string;
    scanCount: number;
    createdAt: string;
}

interface NavigationProps {
    navigation: StackNavigationProp<any, any>;
    route: {
        params?: {
            surveyId?: string;
            surveyTitle?: string;
        };
    };
}

const QRCodeScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
    const [selectedQR, setSelectedQR] = useState<QRCode | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [editDescription, setEditDescription] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const { user } = useAuthContext();

    const surveyId = route.params?.surveyId;
    const surveyTitle = route.params?.surveyTitle;

    // Component mount edildiğinde token kontrolü yap
    useEffect(() => {
        const checkAuthToken = async () => {
            const token = user?.token || await AsyncStorage.getItem('userToken');
            console.log('QRCodeScreen: Token kontrol ediliyor', {
                userTokenExists: !!user?.token,
                asyncStorageTokenExists: !!(await AsyncStorage.getItem('userToken')),
                userObject: user ? JSON.stringify(user).substring(0, 100) + '...' : null
            });

            if (!token) {
                setError('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
                Alert.alert(
                    'Oturum Hatası',
                    'Oturum bilgileriniz bulunamadı. Lütfen tekrar giriş yapın.',
                    [
                        {
                            text: 'Giriş Ekranına Git',
                            onPress: () => navigation.navigate('Login')
                        }
                    ]
                );
            }
        };

        checkAuthToken();
    }, []);

    useEffect(() => {
        if (surveyId) {
            loadQRCodes(surveyId);
        } else {
            loadAllQRCodes();
        }
    }, [surveyId]);

    const loadQRCodes = async (surveyId: string) => {
        try {
            setIsLoading(true);
            setError('');

            // Token kontrol et - user objesi veya token değerini kontrol et
            const token = user?.token || await AsyncStorage.getItem('userToken');

            if (!token) {
                console.error('Token bilgisi bulunamadı:', { user });
                throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
            }

            console.log(`QR kodları yükleniyor, Anket ID: ${surveyId}, Token mevcut:`, !!token);

            const response = await fetch(`${api.getApiUrl()}/api/surveys/qr/survey/${surveyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Sunucu yanıtı:', response.status, errorData);
                throw new Error(errorData.message || errorData.error || 'QR kodları yüklenemedi');
            }

            const data = await response.json();
            console.log(`${data.length || 0} adet QR kod yüklendi`);
            setQrCodes(data || []);
        } catch (err: any) {
            console.error('QR kod yükleme hatası:', err);
            setError(err.message || 'QR kodları yüklenirken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const loadAllQRCodes = async () => {
        try {
            setIsLoading(true);
            setError('');

            // Token kontrol et - user objesi veya token değerini kontrol et
            const token = user?.token || await AsyncStorage.getItem('userToken');

            if (!token) {
                console.error('Token bilgisi bulunamadı:', { user });
                throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
            }

            // Business ID'yi user nesnesinden al
            const businessId = user?.business || user?.businessId;

            if (!businessId) {
                console.error('İşletme bilgisi bulunamadı:', { user });
                throw new Error('İşletme bilgisi bulunamadı');
            }

            console.log(`Tüm QR kodları yükleniyor, İşletme ID: ${businessId}, Token mevcut:`, !!token);

            const response = await fetch(`${api.getApiUrl()}/api/surveys/qr/business/${businessId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Sunucu yanıtı:', response.status, errorData);
                throw new Error(errorData.message || errorData.error || 'QR kodları yüklenemedi');
            }

            const data = await response.json();
            console.log(`${data.length || 0} adet QR kod yüklendi`);
            setQrCodes(data || []);
        } catch (err: any) {
            console.error('QR kod yükleme hatası:', err);
            setError(err.message || 'QR kodları yüklenirken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const generateQRCode = async () => {
        if (!surveyId) {
            Alert.alert('Hata', 'QR kod oluşturmak için anket seçilmelidir');
            return;
        }

        try {
            setIsLoading(true);

            // Token kontrol et - user objesi veya token değerini kontrol et
            const token = user?.token || await AsyncStorage.getItem('userToken');

            if (!token) {
                console.error('Token bilgisi bulunamadı:', { user });
                throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
            }

            console.log(`QR kod oluşturuluyor, Anket ID: ${surveyId}, Token mevcut:`, !!token);

            const response = await fetch(`${api.getApiUrl()}/api/surveys/qr/${surveyId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Sunucu yanıtı:', response.status, errorData);
                throw new Error(errorData.message || errorData.error || 'QR kod oluşturulamadı');
            }

            // QR kod listesini yenile
            await loadQRCodes(surveyId);

            Alert.alert('Başarılı', 'Yeni QR kod oluşturuldu');
        } catch (err: any) {
            console.error('QR kod oluşturma hatası:', err);
            Alert.alert('Hata', err.message || 'QR kod oluşturulurken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteQRCode = async (qrCodeId: string) => {
        Alert.alert(
            'QR Kodu Sil',
            'Bu QR kodu silmek istediğinizden emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);

                            // Token kontrol et - user objesi veya token değerini kontrol et
                            const token = user?.token || await AsyncStorage.getItem('userToken');

                            if (!token) {
                                console.error('Token bilgisi bulunamadı:', { user });
                                throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
                            }

                            console.log(`QR kod siliniyor, QR Kod ID: ${qrCodeId}, Token mevcut:`, !!token);

                            const response = await fetch(`${api.getApiUrl()}/api/surveys/qr/${qrCodeId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });

                            if (!response.ok) {
                                const errorData = await response.json().catch(() => ({}));
                                console.error('Sunucu yanıtı:', response.status, errorData);
                                throw new Error(errorData.message || errorData.error || 'QR kod silinemedi');
                            }

                            // QR kodunu listeden kaldır
                            setQrCodes(prev => prev.filter(qr => qr._id !== qrCodeId));

                            Alert.alert('Başarılı', 'QR kod başarıyla silindi');
                        } catch (err: any) {
                            console.error('QR kod silme hatası:', err);
                            Alert.alert('Hata', err.message || 'QR kod silinirken bir hata oluştu');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const shareQRCode = async (qrCode: QRCode) => {
        try {
            const result = await Share.share({
                message: `${qrCode.surveyTitle} anketi için QR kod: ${qrCode.url}\nManuel giriş kodu: ${qrCode.code}`,
                url: `${api.getApiUrl()}/api/surveys/qr/image/${qrCode._id}`,
                title: `${qrCode.surveyTitle} - QR Kod`
            });
        } catch (error: any) {
            Alert.alert('Hata', error.message);
        }
    };

    const handleEditQR = (qrCode: QRCode) => {
        setSelectedQR(qrCode);
        setEditDescription(qrCode.description || '');
        setEditLocation(qrCode.location || '');
        setModalVisible(true);
    };

    const saveQRChanges = async () => {
        if (!selectedQR) return;

        try {
            setIsLoading(true);

            // Token kontrol et - user objesi veya token değerini kontrol et
            const token = user?.token || await AsyncStorage.getItem('userToken');

            if (!token) {
                console.error('Token bilgisi bulunamadı:', { user });
                throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
            }

            console.log(`QR kod güncelleniyor, QR Kod ID: ${selectedQR._id}, Token mevcut:`, !!token);

            const response = await fetch(`${api.getApiUrl()}/api/surveys/qr/${selectedQR._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    description: editDescription,
                    location: editLocation
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Sunucu yanıtı:', response.status, errorData);
                throw new Error(errorData.message || errorData.error || 'QR kod güncellenemedi');
            }

            // Güncellenen QR'ı listede güncelle
            setQrCodes(prev => prev.map(qr =>
                qr._id === selectedQR._id
                    ? { ...qr, description: editDescription, location: editLocation }
                    : qr
            ));

            setModalVisible(false);
            Alert.alert('Başarılı', 'QR kod bilgileri güncellendi');
        } catch (err: any) {
            console.error('QR kod güncelleme hatası:', err);
            Alert.alert('Hata', err.message || 'QR kod güncellenirken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: QRCode }) => {
        const date = new Date(item.createdAt).toLocaleDateString();

        return (
            <View style={styles.qrItem}>
                <View style={styles.qrInfo}>
                    <Text style={styles.qrCode}>Kod: {item.code}</Text>
                    <Text style={styles.qrDescription}>{item.description || 'Açıklama yok'}</Text>
                    {item.location ? (
                        <Text style={styles.qrLocation}>Konum: {item.location}</Text>
                    ) : null}
                    <Text style={styles.qrStat}>Taranma: {item.scanCount || 0} kez</Text>
                    <Text style={styles.qrDate}>Oluşturulma: {date}</Text>
                </View>

                <View style={styles.qrActions}>
                    <TouchableOpacity
                        style={styles.qrAction}
                        onPress={() => shareQRCode(item)}
                    >
                        <Ionicons name="share-outline" size={22} color="#3498db" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.qrAction}
                        onPress={() => handleEditQR(item)}
                    >
                        <Ionicons name="create-outline" size={22} color="#f39c12" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.qrAction}
                        onPress={() => deleteQRCode(item._id)}
                    >
                        <Ionicons name="trash-outline" size={22} color="#e74c3c" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {surveyTitle ? `${surveyTitle} QR Kodları` : 'QR Kod Yönetimi'}
                </Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {isLoading && qrCodes.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.loadingText}>QR kodlar yükleniyor...</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="alert-circle" size={64} color="#e74c3c" />
                    <Text style={styles.errorTitle}>Hata</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => surveyId ? loadQRCodes(surveyId) : loadAllQRCodes()}
                    >
                        <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <FlatList
                        data={qrCodes}
                        renderItem={renderItem}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="qr-code-outline" size={64} color="#95a5a6" />
                                <Text style={styles.emptyText}>Henüz QR kod oluşturulmamış</Text>
                            </View>
                        }
                    />

                    {surveyId && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={generateQRCode}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="add" size={24} color="white" />
                                    <Text style={styles.addButtonText}>QR Kod Oluştur</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </>
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>QR Kod Düzenle</Text>

                        <Text style={styles.inputLabel}>Açıklama</Text>
                        <TextInput
                            style={styles.input}
                            value={editDescription}
                            onChangeText={setEditDescription}
                            placeholder="Örn: Giriş QR Kodu, Masa 5..."
                        />

                        <Text style={styles.inputLabel}>Konum</Text>
                        <TextInput
                            style={styles.input}
                            value={editLocation}
                            onChangeText={setEditLocation}
                            placeholder="Örn: Giriş, Kasa, Masa 5..."
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>İptal</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={saveQRChanges}
                            >
                                <Text style={styles.saveButtonText}>Kaydet</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
    listContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    qrItem: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    qrInfo: {
        flex: 1,
    },
    qrCode: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 4,
    },
    qrDescription: {
        fontSize: 14,
        color: '#34495e',
        marginBottom: 4,
    },
    qrLocation: {
        fontSize: 14,
        color: '#34495e',
        marginBottom: 4,
    },
    qrStat: {
        fontSize: 13,
        color: '#7f8c8d',
    },
    qrDate: {
        fontSize: 13,
        color: '#7f8c8d',
        marginTop: 4,
    },
    qrActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#ecf0f1',
        paddingTop: 12,
    },
    qrAction: {
        marginLeft: 16,
        padding: 4,
    },
    addButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#3498db',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#95a5a6',
        textAlign: 'center',
        marginTop: 16,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 24,
        width: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 8,
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginLeft: 8,
    },
    cancelButton: {
        backgroundColor: '#ecf0f1',
    },
    cancelButtonText: {
        color: '#7f8c8d',
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#3498db',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default QRCodeScreen;
