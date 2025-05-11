import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback, Platform } from 'react-native';

// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
// @ts-ignore
import { StackNavigationProp } from '@react-navigation/stack';

interface NavigationProps {
    navigation: StackNavigationProp<any, any>;
}

// BarCodeScanner için tip tanımlaması
interface BarCodeEvent {
    type: string;
    data: string;
}

const ScanQRScreen: React.FC<NavigationProps> = ({ navigation }) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(false);
    const [scanned, setScanned] = useState(false);
    const [scanMode, setScanMode] = useState(false); // false = manuel giriş, true = kamera
    const [manualCode, setManualCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const toggleScanMode = () => {
        // Şimdilik kamera modunu devre dışı bırakalım
        // setScanMode(!scanMode);
        Alert.alert(
            "Kamera Kullanılamıyor",
            "Bu sürümde kamera modülü aktif değil. Lütfen manuel kod girişi kullanın.",
            [{ text: "Tamam", style: "default" }]
        );
    };

    const handleManualSubmit = () => {
        Keyboard.dismiss();
        if (!manualCode.trim()) {
            setError('Lütfen bir kod girin');
            return;
        }

        processCode(manualCode.trim());
    };

    const processCode = async (code: string) => {
        try {
            setIsLoading(true);
            setError('');

            // API isteği ile kod kontrolü yap
            console.log(`Kod ile anket aranıyor: ${code}`);
            const response = await fetch(`${api.getApiUrl()}/api/surveys/code/${code}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Geçersiz anket kodu. Lütfen doğru kodu girdiğinizden emin olun.');
                } else {
                    throw new Error('Anket bilgileri alınamadı. Lütfen daha sonra tekrar deneyin.');
                }
            }

            const data = await response.json();
            console.log('Anket bulundu:', data);

            // QR kodun taranma sayısını artır
            try {
                await fetch(`${api.getApiUrl()}/api/surveys/qr/scan`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ code })
                });
            } catch (error) {
                console.error('Tarama kaydedilemedi:', error);
                // Bu hata kritik değil, devam edebiliriz
            }

            // Anketi göster
            navigation.navigate('SurveyForm', {
                surveyId: data._id || data.id,
                code: code
            });

        } catch (err: any) {
            console.error('Kod işleme hatası:', err);
            setError(err.message || 'Anket yüklenirken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    // Kamera modülü kullanılamıyor mesajını göster
    const renderUnavailableCamera = () => {
        return (
            <View style={styles.centered}>
                <Ionicons name="close-circle" size={64} color="#e74c3c" />
                <Text style={styles.permissionText}>Kamera kullanılamıyor</Text>
                <Text style={styles.permissionSubtext}>Bu sürümde kamera işlevi aktif değil. Lütfen manuel kod girişi kullanın.</Text>
                <TouchableOpacity style={styles.manualButton} onPress={() => setScanMode(false)}>
                    <Text style={styles.manualButtonText}>Manuel Kod Girişi</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {scanMode ? 'QR Kodu Tara' : 'Kod Giriş'}
                    </Text>
                    <TouchableOpacity
                        style={styles.modeButton}
                        onPress={toggleScanMode}
                    >
                        <Ionicons
                            name={scanMode ? "create-outline" : "scan-outline"}
                            size={24}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#3498db" />
                        <Text style={styles.loadingText}>Anket yükleniyor...</Text>
                    </View>
                ) : scanMode ? (
                    renderUnavailableCamera()
                ) : (
                    <View style={styles.manualContainer}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="keypad-outline" size={64} color="#3498db" />
                        </View>
                        <Text style={styles.manualTitle}>Manuel Kod Girişi</Text>
                        <Text style={styles.manualSubtitle}>
                            QR kodun altında bulunan kodu girin
                        </Text>
                        <TextInput
                            style={styles.codeInput}
                            value={manualCode}
                            onChangeText={setManualCode}
                            placeholder="Ankete özel kodu girin"
                            placeholderTextColor="#95a5a6"
                            autoCapitalize="none"
                            maxLength={20}
                        />
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleManualSubmit}
                        >
                            <Text style={styles.submitButtonText}>Ankete Git</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </TouchableWithoutFeedback>
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
    backButton: {
        padding: 8,
    },
    modeButton: {
        padding: 8,
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 16,
        paddingHorizontal: 20,
    },
    manualContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
    },
    manualTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 8,
    },
    manualSubtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        marginBottom: 24,
    },
    codeInput: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    submitButton: {
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    manualButton: {
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 20,
    },
    manualButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    permissionText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 16,
        marginBottom: 8,
    },
    permissionSubtext: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
        marginBottom: 20,
    },
    loadingText: {
        fontSize: 16,
        color: '#34495e',
        marginTop: 16,
    },
});

export default ScanQRScreen; 