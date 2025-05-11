import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { useNavigation } from '@react-navigation/native';

interface CommonHeaderProps {
    title: string;
    showBackButton?: boolean;
    rightComponent?: React.ReactNode;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({
    title,
    showBackButton = true,
    rightComponent
}) => {
    const navigation = useNavigation();

    return (
        <View style={styles.header}>
            {showBackButton ? (
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
            ) : (
                <View style={styles.placeholderView} />
            )}

            <Text style={styles.headerTitle}>{title}</Text>

            {rightComponent ? (
                rightComponent
            ) : (
                <View style={styles.placeholderView} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 16,
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
    placeholderView: {
        width: 40,
    },
});

export default CommonHeader; 