import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { useNavigation } from '@react-navigation/native';

interface Survey {
    _id: string;
    title: string;
    isActive: boolean;
    responseCount: number;
    createdAt: string;
}

interface UserSurveyComponentProps {
    surveys: Survey[];
    onViewAll?: () => void;
}

const UserSurveyComponent: React.FC<UserSurveyComponentProps> = ({
    surveys,
    onViewAll
}) => {
    const navigation = useNavigation();

    const renderSurveyItem = ({ item }: { item: Survey }) => {
        const date = new Date(item.createdAt).toLocaleDateString();

        return (
            <TouchableOpacity
                style={styles.surveyCard}
                onPress={() => {
                    // @ts-ignore
                    navigation.navigate('SurveyDetail', { surveyId: item._id });
                }}
            >
                <View style={styles.surveyHeader}>
                    <Text style={styles.surveyTitle} numberOfLines={1}>{item.title}</Text>
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

                <View style={styles.surveyInfo}>
                    <View style={styles.infoItem}>
                        <Ionicons name="chatbubble-outline" size={16} color="#7f8c8d" />
                        <Text style={styles.infoText}>{item.responseCount} yanıt</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Ionicons name="calendar-outline" size={16} color="#7f8c8d" />
                        <Text style={styles.infoText}>{date}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Anketlerim</Text>
                {onViewAll && (
                    <TouchableOpacity onPress={onViewAll}>
                        <Text style={styles.viewAllText}>Tümünü Gör</Text>
                    </TouchableOpacity>
                )}
            </View>

            {surveys.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={48} color="#bdc3c7" />
                    <Text style={styles.emptyText}>Henüz anket oluşturulmamış</Text>
                </View>
            ) : (
                <FlatList
                    data={surveys}
                    renderItem={renderSurveyItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    viewAllText: {
        color: '#3498db',
        fontWeight: '500',
    },
    list: {
        paddingBottom: 8,
    },
    surveyCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    surveyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    surveyTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#34495e',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    surveyInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 12,
        color: '#7f8c8d',
        marginLeft: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    emptyText: {
        color: '#95a5a6',
        marginTop: 8,
    },
});

export default UserSurveyComponent; 