import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { useNavigation } from '@react-navigation/native';

interface Survey {
    _id: string;
    title: string;
    description?: string;
    isActive: boolean;
    questions?: number;
    createdAt: string;
    owner?: string;
}

interface RecentSurveysComponentProps {
    surveys: Survey[];
    title?: string;
    showViewAll?: boolean;
    onViewAll?: () => void;
}

const RecentSurveysComponent: React.FC<RecentSurveysComponentProps> = ({
    surveys,
    title = "Son Oluşturulan Anketler",
    showViewAll = true,
    onViewAll
}) => {
    const navigation = useNavigation();

    const renderSurveyItem = ({ item }: { item: Survey }) => {
        const date = new Date(item.createdAt).toLocaleDateString();

        return (
            <TouchableOpacity
                style={styles.surveyItem}
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

                {item.description && (
                    <Text style={styles.surveyDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <View style={styles.surveyFooter}>
                    {item.questions !== undefined && (
                        <View style={styles.footerItem}>
                            <Ionicons name="help-circle-outline" size={14} color="#7f8c8d" />
                            <Text style={styles.footerText}>{item.questions} soru</Text>
                        </View>
                    )}
                    <View style={styles.footerItem}>
                        <Ionicons name="calendar-outline" size={14} color="#7f8c8d" />
                        <Text style={styles.footerText}>{date}</Text>
                    </View>
                    {item.owner && (
                        <View style={styles.footerItem}>
                            <Ionicons name="person-outline" size={14} color="#7f8c8d" />
                            <Text style={styles.footerText}>{item.owner}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                {showViewAll && onViewAll && (
                    <TouchableOpacity onPress={onViewAll}>
                        <Text style={styles.viewAllText}>Tümünü Gör</Text>
                    </TouchableOpacity>
                )}
            </View>

            {surveys.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={48} color="#bdc3c7" />
                    <Text style={styles.emptyText}>Henüz anket bulunmuyor</Text>
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
    surveyItem: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    surveyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    surveyTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#34495e',
        flex: 1,
        marginRight: 8,
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
    surveyDescription: {
        fontSize: 13,
        color: '#7f8c8d',
        marginBottom: 8,
    },
    surveyFooter: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
        marginBottom: 4,
    },
    footerText: {
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

export default RecentSurveysComponent; 