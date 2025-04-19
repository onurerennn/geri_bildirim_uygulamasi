import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    RefreshControl,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { Text, Card, IconButton, Badge, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import businessService, { Business } from '../../services/businessService';
import { MainStackParamList } from '../../types/navigation';

type BusinessesScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

const BusinessesScreen = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation<BusinessesScreenNavigationProp>();

    const fetchBusinesses = async () => {
        try {
            const data = await businessService.getBusinesses();
            setBusinesses(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch businesses');
        }
    };

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchBusinesses();
        setRefreshing(false);
    };

    const handleDelete = (business: Business) => {
        Alert.alert(
            'Delete Business',
            `Are you sure you want to delete ${business.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await businessService.deleteBusiness(business._id);
                            fetchBusinesses();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete business');
                        }
                    },
                },
            ]
        );
    };

    const handleApprove = async (id: string) => {
        try {
            await businessService.approveBusiness(id);
            fetchBusinesses();
        } catch (error) {
            Alert.alert('Error', 'Failed to approve business');
        }
    };

    const renderItem = ({ item: business }: { item: Business }) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.name}>{business.name}</Text>
                        <Text style={styles.email}>{business.email}</Text>
                        <Text style={styles.phone}>{business.phone}</Text>
                    </View>
                    <View style={styles.badges}>
                        <Badge
                            style={[
                                styles.badge,
                                {
                                    backgroundColor: business.isApproved ? '#4caf50' : '#ff9800',
                                },
                            ]}
                        >
                            {business.isApproved ? 'Approved' : 'Pending'}
                        </Badge>
                        <Badge
                            style={[
                                styles.badge,
                                {
                                    backgroundColor: business.isActive ? '#2196f3' : '#9e9e9e',
                                },
                            ]}
                        >
                            {business.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.approvedBy}>
                        {business.approvedBy ? `Approved by ${business.approvedBy.name}` : ''}
                    </Text>
                    <View style={styles.actions}>
                        <IconButton
                            icon="pencil"
                            size={20}
                            onPress={() => navigation.navigate('BusinessForm', { business })}
                        />
                        <IconButton
                            icon="delete"
                            size={20}
                            onPress={() => handleDelete(business)}
                        />
                        {!business.isApproved && (
                            <IconButton
                                icon="check-circle"
                                size={20}
                                onPress={() => handleApprove(business._id)}
                            />
                        )}
                    </View>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={businesses}
                renderItem={renderItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            />
            <FAB
                style={styles.fab}
                icon="plus"
                onPress={() => navigation.navigate('BusinessForm', {})}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    list: {
        padding: 16,
    },
    card: {
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    email: {
        fontSize: 14,
        color: '#666',
    },
    phone: {
        fontSize: 14,
        color: '#666',
    },
    badges: {
        flexDirection: 'column',
        gap: 4,
    },
    badge: {
        alignSelf: 'flex-start',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    approvedBy: {
        fontSize: 12,
        color: '#666',
    },
    actions: {
        flexDirection: 'row',
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
});

export default BusinessesScreen; 