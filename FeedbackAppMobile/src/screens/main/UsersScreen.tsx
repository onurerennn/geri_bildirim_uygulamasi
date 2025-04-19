import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import userService, { User } from '../../services/userService';
import { FAB, Card, IconButton } from 'react-native-paper';

const UsersScreen = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();

    const fetchUsers = async () => {
        try {
            const data = await userService.getUsers();
            setUsers(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch users');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchUsers();
        setRefreshing(false);
    };

    const handleDelete = (user: User) => {
        Alert.alert(
            'Delete User',
            `Are you sure you want to delete ${user.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await userService.deleteUser(user._id);
                            fetchUsers();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    },
                },
            ]
        );
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return '#f44336';
            case 'BUSINESS_ADMIN':
                return '#2196f3';
            case 'CUSTOMER':
                return '#4caf50';
            default:
                return '#000000';
        }
    };

    const renderItem = ({ item: user }: { item: User }) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.email}>{user.email}</Text>
                    </View>
                    <View style={styles.actions}>
                        <IconButton
                            icon="pencil"
                            size={20}
                            onPress={() => navigation.navigate('UserForm', { user })}
                        />
                        <IconButton
                            icon="delete"
                            size={20}
                            onPress={() => handleDelete(user)}
                        />
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Text style={[styles.role, { color: getRoleColor(user.role) }]}>
                        {user.role}
                    </Text>
                    <Text style={[styles.status, { color: user.isActive ? '#4caf50' : '#f44336' }]}>
                        {user.isActive ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={users}
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
                onPress={() => navigation.navigate('UserForm')}
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
        alignItems: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    email: {
        fontSize: 14,
        color: '#666',
    },
    actions: {
        flexDirection: 'row',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    role: {
        fontWeight: 'bold',
    },
    status: {
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
});

export default UsersScreen; 