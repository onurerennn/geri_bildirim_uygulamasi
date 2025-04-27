import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Share, Alert, ActivityIndicator } from 'react-native';
import { Text, Card, Button, Title, useTheme } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface QRCodeScreenProps {
    route: {
        params: {
            surveyId: string;
        }
    };
    navigation: any;
}

interface QRCodeData {
    _id: string;
    code: string;
    url: string;
    survey: {
        _id: string;
        title: string;
    };
    business: {
        _id: string;
        name: string;
    };
    isActive: boolean;
    createdAt: string;
}

const QRCodeScreen = ({ route, navigation }: QRCodeScreenProps) => {
    const { surveyId } = route.params;
    const { token } = useAuth();
    const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        checkExistingQRCode();
    }, []);

    const checkExistingQRCode = async () => {
        try {
            setLoading(true);
            // Anket için QR Kodu kontrol et
            const response = await api.get(`/qrcodes/survey/${surveyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success && response.data.data.length > 0) {
                setQrCode(response.data.data[0]);
            }
        } catch (error) {
            console.error('QR Kod bilgisi alınırken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateQRCode = async () => {
        try {
            setGenerating(true);

            const response = await api.post('/qrcodes', {
                surveyId: surveyId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setQrCode(response.data.data);
                Alert.alert('Başarılı', 'QR Kod başarıyla oluşturuldu.');
            }
        } catch (error) {
            console.error('QR Kod oluşturulurken hata:', error);
            Alert.alert('Hata', 'QR Kod oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setGenerating(false);
        }
    };

    const shareQRCode = async () => {
        if (!qrCode) return;

        try {
            await Share.share({
                message: `${qrCode.survey.title} anketini doldurmak için bu bağlantıyı kullanabilirsiniz: ${qrCode.url}`,
                url: qrCode.url,
                title: `${qrCode.survey.title} Anketi`
            });
        } catch (error) {
            console.error('Paylaşım hatası:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>QR Kod bilgisi kontrol ediliyor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <Title style={styles.title}>QR Kod</Title>

                    {qrCode ? (
                        <>
                            <View style={styles.qrContainer}>
                                {/* QR Kod görüntüsünü göster - Base64 formatında gelebilir */}
                                <Text style={styles.qrPlaceholder}>
                                    QR Kod: {qrCode.code}
                                </Text>
                                {/* Gerçek uygulamada buraya bir Image komponenti koyabilirsiniz */}
                            </View>

                            <Text style={styles.surveyTitle}>{qrCode.survey.title}</Text>
                            <Text style={styles.url}>{qrCode.url}</Text>

                            <View style={styles.buttonContainer}>
                                <Button
                                    mode="contained"
                                    onPress={shareQRCode}
                                    style={styles.button}
                                    icon="share"
                                >
                                    Paylaş
                                </Button>
                                <Button
                                    mode="outlined"
                                    onPress={() => navigation.goBack()}
                                    style={styles.button}
                                >
                                    Geri Dön
                                </Button>
                            </View>
                        </>
                    ) : (
                        <>
                            <Text style={styles.emptyText}>
                                Bu anket için henüz QR Kod oluşturulmamış.
                            </Text>
                            <Button
                                mode="contained"
                                onPress={generateQRCode}
                                loading={generating}
                                disabled={generating}
                                style={styles.generateButton}
                            >
                                QR Kod Oluştur
                            </Button>
                        </>
                    )}
                </Card.Content>
            </Card>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
    },
    card: {
        padding: 8,
        elevation: 3,
    },
    title: {
        textAlign: 'center',
        marginBottom: 16,
    },
    qrContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        height: 200,
        width: '100%',
    },
    qrPlaceholder: {
        fontSize: 16,
        textAlign: 'center',
    },
    surveyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    url: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyText: {
        textAlign: 'center',
        marginVertical: 40,
        fontSize: 16,
        color: '#666',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        marginHorizontal: 4,
    },
    generateButton: {
        marginTop: 16,
    },
});

export default QRCodeScreen; 