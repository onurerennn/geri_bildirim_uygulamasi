import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

interface UserCount {
    total: number;
    active: number;
    today?: number;
    thisWeek?: number;
    thisMonth?: number;
}

interface UserCountComponentProps {
    data: UserCount;
    title?: string;
}

const UserCountComponent: React.FC<UserCountComponentProps> = ({
    data,
    title = "Kullanıcı İstatistikleri"
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.mainStatsContainer}>
                <View style={styles.mainStatItem}>
                    <Text style={styles.statValue}>{data.total}</Text>
                    <Text style={styles.statLabel}>Toplam Kullanıcı</Text>
                </View>

                <View style={styles.mainStatDivider} />

                <View style={styles.mainStatItem}>
                    <Text style={styles.statValue}>{data.active}</Text>
                    <Text style={styles.statLabel}>Aktif Kullanıcı</Text>
                </View>
            </View>

            {(data.today !== undefined || data.thisWeek !== undefined || data.thisMonth !== undefined) && (
                <View style={styles.secondaryStatsContainer}>
                    {data.today !== undefined && (
                        <View style={styles.secondaryStatItem}>
                            <Ionicons name="today-outline" size={18} color="#3498db" />
                            <Text style={styles.secondaryStatValue}>{data.today}</Text>
                            <Text style={styles.secondaryStatLabel}>Bugün</Text>
                        </View>
                    )}

                    {data.thisWeek !== undefined && (
                        <View style={styles.secondaryStatItem}>
                            <Ionicons name="calendar-outline" size={18} color="#2ecc71" />
                            <Text style={styles.secondaryStatValue}>{data.thisWeek}</Text>
                            <Text style={styles.secondaryStatLabel}>Bu Hafta</Text>
                        </View>
                    )}

                    {data.thisMonth !== undefined && (
                        <View style={styles.secondaryStatItem}>
                            <Ionicons name="analytics-outline" size={18} color="#9b59b6" />
                            <Text style={styles.secondaryStatValue}>{data.thisMonth}</Text>
                            <Text style={styles.secondaryStatLabel}>Bu Ay</Text>
                        </View>
                    )}
                </View>
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
    mainStatsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    mainStatItem: {
        alignItems: 'center',
    },
    mainStatDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#ddd',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    secondaryStatsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    secondaryStatItem: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 4,
    },
    secondaryStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#34495e',
        marginVertical: 4,
    },
    secondaryStatLabel: {
        fontSize: 11,
        color: '#7f8c8d',
    },
});

export default UserCountComponent; 