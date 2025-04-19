import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useNavigation } from '@react-navigation/native';
import surveyService from '../../services/surveyService';

const ScanScreen = () => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const navigation = useNavigation();

    React.useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getBarCodeScannerPermissions();
    }, []);

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        setScanned(true);
        try {
            // Assuming the QR code contains a survey ID
            const survey = await surveyService.getSurvey(data);
            // TODO: Navigate to survey response screen with survey data
            console.log('Survey found:', survey);
        } catch (error) {
            console.error('Error fetching survey:', error);
            // TODO: Show error message
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
            <View style={styles.container}>
                <Text>Kamera erişimi reddedildi</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <BarCodeScanner
                onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={styles.scanner}
            />
            {scanned && (
                <Button
                    mode="contained"
                    onPress={() => setScanned(false)}
                    style={styles.button}
                >
                    Tekrar Tara
                </Button>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanner: {
        width: '100%',
        height: '80%',
    },
    button: {
        position: 'absolute',
        bottom: 20,
    },
});

export default ScanScreen; 