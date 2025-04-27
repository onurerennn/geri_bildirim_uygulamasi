import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, Image } from 'react-native';
import { Card, Title, Button, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../types/navigation';
import surveyService from '../../services/surveyService';
import { QRCode } from '../../types';

type QRCodesScreenNavigationProp = StackNavigationProp<MainStackParamList, 'QRCodes'>;

const QRCodesScreen = () => {
    const navigation = useNavigation<QRCodesScreenNavigationProp>();
    const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchQRCodes();
    }, []);

    const fetchQRCodes = async () => {
        try {
            setLoading(true);
            // Replace with actual business ID or get from context
            const businessId = "your-business-id";
            const fetchedQRCodes = await surveyService.getBusinessQRCodes(businessId);
            setQRCodes(fetchedQRCodes);
        } catch (error) {
            console.error('Error fetching QR codes:', error);
            Alert.alert('Error', 'Failed to load QR codes');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchQRCodes();
    };

    const handleDeleteQRCode = async (qrCodeId: string) => {
        try {
            await surveyService.deleteQRCode(qrCodeId);
            setQRCodes(qrCodes.filter(qr => qr._id !== qrCodeId));
            Alert.alert('Success', 'QR code deleted successfully');
        } catch (error) {
            console.error('Error deleting QR code:', error);
            Alert.alert('Error', 'Failed to delete QR code');
        }
    };

    const confirmDelete = (qrCodeId: string) => {
        Alert.alert(
            'Delete QR Code',
            'Are you sure you want to delete this QR code?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', onPress: () => handleDeleteQRCode(qrCodeId), style: 'destructive' }
            ]
        );
    };

    const handleViewQRCode = (qrCode: QRCode) => {
        navigation.navigate('QRCodeDetail', { qrCode });
    };

    const renderQRCodeItem = ({ item }: { item: QRCode }) => (
        <Card style={styles.card}>
            <Card.Content>
                <Title>QR Code: {item.code}</Title>
                <Text style={styles.infoText}>Survey: {item.surveyTitle || 'Unknown'}</Text>
                <Text style={styles.infoText}>Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: item.url }}
                        style={styles.qrImage}
                        resizeMode="contain"
                    />
                </View>
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
                <IconButton
                    icon="eye"
                    size={20}
                    onPress={() => handleViewQRCode(item)}
                />
                <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => confirmDelete(item._id)}
                />
            </Card.Actions>
        </Card>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Title>QR Codes</Title>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
            ) : (
                <FlatList
                    data={qrCodes}
                    renderItem={renderQRCodeItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContainer}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No QR codes found</Text>
                            <Button mode="contained" onPress={handleRefresh}>
                                Refresh
                            </Button>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        elevation: 2,
    },
    listContainer: {
        padding: 16,
    },
    card: {
        marginBottom: 16,
    },
    cardActions: {
        justifyContent: 'flex-end',
    },
    infoText: {
        marginTop: 4,
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        marginBottom: 16,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    qrImage: {
        width: 150,
        height: 150,
        backgroundColor: '#f0f0f0',
    }
});

export default QRCodesScreen; 