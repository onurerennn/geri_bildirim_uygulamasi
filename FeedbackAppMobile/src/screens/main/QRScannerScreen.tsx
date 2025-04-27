import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Alert, ActivityIndicator } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Button, useTheme } from 'react-native-paper';
import api from '../../services/api';

const QRScannerScreen = ({ navigation }: any) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        (async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        setScanned(true);
        setLoading(true);

        try {
            // QR kodun geçerli bir anket URL'si olup olmadığını kontrol et
            if (data.includes('/survey/')) {
                // URL'den QR kodunu ve anket ID'sini çıkar
                const urlParts = data.split('/');
                const qrCodeIndex = urlParts.indexOf('survey') + 2; // survey/[id]/[qrcode]
                const surveyIdIndex = urlParts.indexOf('survey') + 1;

                if (qrCodeIndex >= urlParts.length || surveyIdIndex >= urlParts.length) {
                    throw new Error('Geçersiz QR kod URL formatı');
                }

                const qrCode = urlParts[qrCodeIndex];
                const surveyId = urlParts[surveyIdIndex];

                // QR kodun geçerliliğini kontrol et
                const response = await api.get(`/qrcodes/validate/${qrCode}`);

                if (response.data.success) {
                    // Geçerli QR kod, ankete yönlendir
                    navigation.replace('SurveyResponse', {
                        surveyId: surveyId,
                        qrCode: qrCode
                    });
                } else {
                    Alert.alert('Hata', 'Geçersiz veya süresi dolmuş QR kod.');
                }
            } else {
                Alert.alert('Hata', 'Bu QR kod bir anket için geçerli değil.');
            }
        } catch (error) {
            console.error('QR kod taraması hatası:', error);
            Alert.alert('Hata', 'QR kod işlenirken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <Text>Kamera izni isteniyor...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>QR kod taramak için kamera izni gerekiyor.</Text>
                <Button
                    mode="contained"
                    onPress={() => navigation.goBack()}
                    style={styles.button}
                >
                    Geri Dön
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>QR kod işleniyor...</Text>
                </View>
            ) : (
                <>
                    <BarCodeScanner
                        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                        style={styles.scanner}
                    />

                    <View style={styles.overlay}>
                        <View style={styles.scanBox} />
                        <Text style={styles.instructions}>
                            Ankete erişmek için QR kodu tarayın
                        </Text>
                    </View>

                    {scanned && !loading && (
                        <Button
                            mode="contained"
                            onPress={() => setScanned(false)}
                            style={styles.scanAgainButton}
                        >
                            Tekrar Tara
                        </Button>
                    )}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    permissionText: {
        textAlign: 'center',
        marginBottom: 20,
    },
    scanner: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanBox: {
        width: 200,
        height: 200,
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: 'transparent',
    },
    instructions: {
        color: 'white',
        marginTop: 20,
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 10,
        borderRadius: 5,
    },
    scanAgainButton: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        paddingHorizontal: 30,
        borderRadius: 30,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 16,
    },
    button: {
        marginTop: 20,
    },
});

export default QRScannerScreen; 