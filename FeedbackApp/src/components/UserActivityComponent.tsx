import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

interface Activity {
    _id: string;
    type: 'new_survey' | 'new_response' | 'survey_completed' | 'other';
    description: string;
    timestamp: string;
}

interface UserActivityComponentProps {
    activities: Activity[];
    title?: string;
}

const UserActivityComponent: React.FC<UserActivityComponentProps> = ({
    activities,
    title = "Son Aktiviteler"
}) => {
    const getActivityIcon = (type: Activity['type']) => {
        switch (type) {
            case 'new_survey':
                return { name: 'create-outline', color: '#3498db' };
            case 'new_response':
                return { name: 'chatbubble-outline', color: '#2ecc71' };
            case 'survey_completed':
                return { name: 'checkmark-circle-outline', color: '#e74c3c' };
            default:
                return { name: 'time-outline', color: '#7f8c8d' };
        }
    };

    const renderActivityItem = ({ item }: { item: Activity }) => {
        const icon = getActivityIcon(item.type);
        const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = new Date(item.timestamp).toLocaleDateString();

        return (
            <View style={styles.activityItem}>
                <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                </View>
                <View style={styles.activityContent}>
                    <Text style={styles.activityDescription}>{item.description}</Text>
                    <Text style={styles.activityTime}>{date} {time}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>

            {activities.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={48} color="#bdc3c7" />
                    <Text style={styles.emptyText}>Henüz aktivite bulunmuyor</Text>
                </View>
            ) : (
                <FlatList
                    data={activities}
                    renderItem={renderActivityItem}
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
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 16,
    },
    list: {
        paddingBottom: 8,
    },
    activityItem: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 12,
    },
    activityDescription: {
        fontSize: 14,
        color: '#34495e',
        marginBottom: 4,
    },
    activityTime: {
        fontSize: 12,
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

export default UserActivityComponent; 