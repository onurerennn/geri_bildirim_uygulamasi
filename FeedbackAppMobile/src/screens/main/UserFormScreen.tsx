import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { TextInput, Button, HelperText, Appbar, SegmentedButtons } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import userService, { User, CreateUserData, UpdateUserData } from '../../services/userService';

const UserFormScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const user = route.params?.user as User;

    const [formData, setFormData] = useState<CreateUserData | UpdateUserData>({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        role: user?.role || 'CUSTOMER',
    });

    const handleSubmit = async () => {
        try {
            if (!formData.name || !formData.email || (!user && !formData.password)) {
                Alert.alert('Error', 'Please fill in all required fields');
                return;
            }

            if (user) {
                await userService.updateUser(user._id, formData);
            } else {
                await userService.createUser(formData as CreateUserData);
            }

            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save user');
        }
    };

    return (
        <View style={styles.container}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title={user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'} />
            </Appbar.Header>

            <ScrollView style={styles.content}>
                <TextInput
                    label="Ad Soyad"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    mode="outlined"
                    error={!!errors.name}
                    style={styles.input}
                />
                <HelperText type="error" visible={!!errors.name}>
                    {errors.name}
                </HelperText>

                <TextInput
                    label="E-posta"
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={!!errors.email}
                    style={styles.input}
                />
                <HelperText type="error" visible={!!errors.email}>
                    {errors.email}
                </HelperText>

                {!user && (
                    <TextInput
                        label="Şifre"
                        value={formData.password}
                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                        mode="outlined"
                        secureTextEntry
                        error={!!errors.password}
                        style={styles.input}
                    />
                )}

                <SegmentedButtons
                    value={formData.role}
                    onValueChange={(value) =>
                        setFormData({ ...formData, role: value as User['role'] })
                    }
                    buttons={[
                        { value: 'SUPER_ADMIN', label: 'Süper Admin' },
                        { value: 'BUSINESS_ADMIN', label: 'İşletme Admin' },
                        { value: 'CUSTOMER', label: 'Müşteri' },
                    ]}
                    style={styles.roleButtons}
                />

                <View style={styles.buttonContainer}>
                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        style={styles.button}
                    >
                        {user ? 'Güncelle' : 'Oluştur'}
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.goBack()}
                        style={styles.button}
                    >
                        İptal
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 16,
    },
    input: {
        marginBottom: 4,
    },
    roleButtons: {
        marginVertical: 16,
    },
    buttonContainer: {
        gap: 12,
    },
    button: {
        padding: 4,
    },
});

export default UserFormScreen; 