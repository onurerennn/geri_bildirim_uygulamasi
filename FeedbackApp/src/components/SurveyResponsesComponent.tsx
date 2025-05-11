import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

interface Response {
    _id: string;
    surveyId: string;
    surveyTitle: string;
    userId?: string;
    userName?: string;
    createdAt: string;
    rating?: number;
    answers?: { questionId: string; answer: string }[];
}

interface SurveyResponsesComponentProps {
    title?: string;
    responses: Response[];
    onViewResponse?: (response: Response) => void;
    onViewAll?: () => void;
}

const SurveyResponsesComponent: React.FC<SurveyResponsesComponentProps> = ({
    title = "Son Yanıtlar",
    responses,
    onViewResponse,
    onViewAll
}) => {
    // Yıldız gösterimi için yardımcı fonksiyon
    const renderStars = (rating?: number) => {
        if (!rating) return null;

        const stars = [];
        const maxRating = 5;

        for (let i = 1; i <= maxRating; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i <= rating ? "star" : "star-outline"}
                    size={16}
                    color={i <= rating ? "#f1c40f" : "#bdc3c7"}
                    style={{ marginRight: 2 }}
                />
            );
        }

        return (
            <View style={styles.starsContainer}>
                {stars}
            </View>
        );
    };

    const renderResponseItem = ({ item }: { item: Response }) => {
        const date = new Date(item.createdAt).toLocaleDateString();

        return (
            <TouchableOpacity
                style={styles.responseItem}
                onPress={() => onViewResponse && onViewResponse(item)}
            >
                <View style={styles.responseHeader}>
                    <Text style={styles.surveyTitle} numberOfLines={1}>{item.surveyTitle}</Text>
                    <Text style={styles.responseDate}>{date}</Text>
                </View>

                {item.userName && (
                    <Text style={styles.userName}>
                        <Ionicons name="person" size={14} color="#7f8c8d" /> {item.userName}
                    </Text>
                )}

                {renderStars(item.rating)}

                {item.answers && item.answers.length > 0 && (
                    <Text style={styles.answersCount}>
                        <Ionicons name="list" size={14} color="#7f8c8d" /> {item.answers.length} soru yanıtlandı
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                {onViewAll && (
                    <TouchableOpacity onPress={onViewAll}>
                        <Text style={styles.viewAllText}>Tümünü Gör</Text>
                    </TouchableOpacity>
                )}
            </View>

            {responses.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#bdc3c7" />
                    <Text style={styles.emptyText}>Henüz yanıt bulunmuyor</Text>
                </View>
            ) : (
                <FlatList
                    data={responses}
                    renderItem={renderResponseItem}
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
    responseItem: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    responseHeader: {
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
    responseDate: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    userName: {
        fontSize: 13,
        color: '#7f8c8d',
        marginBottom: 6,
    },
    starsContainer: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    answersCount: {
        fontSize: 13,
        color: '#7f8c8d',
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

export default SurveyResponsesComponent; 