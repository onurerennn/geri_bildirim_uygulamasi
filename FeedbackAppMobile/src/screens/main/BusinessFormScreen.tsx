import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, HelperText, Appbar } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import businessService, { Business, CreateBusinessData } from '../../services/businessService';
import { MainStackParamList } from '../../types/navigation';

type BusinessFormScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'BusinessForm'>;
type BusinessFormScreenRouteProp = RouteProp<MainStackParamList, 'BusinessForm'>;

interface FormData {
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
}

interface FormErrors {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    description?: string;
}

const BusinessFormScreen = () => {
    const navigation = useNavigation<BusinessFormScreenNavigationProp>();
    const route = useRoute<BusinessFormScreenRouteProp>();
    const business = route.params?.business as Business | undefined;

    const [formData, setFormData] = useState<FormData>({
        name: business?.name || '',
        address: business?.address || '',
        phone: business?.phone || '',
        email: business?.email || '',
        description: business?.description || '',
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.address.trim()) {
            newErrors.address = 'Address is required';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const data: CreateBusinessData = {
                name: formData.name.trim(),
                address: formData.address.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim(),
                description: formData.description.trim(),
            };

            if (business) {
                await businessService.updateBusiness(business._id, data);
            } else {
                await businessService.createBusiness(data);
            }

            navigation.goBack();
        } catch (error) {
            Alert.alert(
                'Error',
                business
                    ? 'Failed to update business'
                    : 'Failed to create business'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title={business ? 'Edit Business' : 'New Business'} />
            </Appbar.Header>

            <ScrollView style={styles.content}>
                <TextInput
                    label="Name"
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
                    label="Address"
                    value={formData.address}
                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                    mode="outlined"
                    error={!!errors.address}
                    style={styles.input}
                    multiline
                />
                <HelperText type="error" visible={!!errors.address}>
                    {errors.address}
                </HelperText>

                <TextInput
                    label="Phone"
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    mode="outlined"
                    error={!!errors.phone}
                    style={styles.input}
                    keyboardType="phone-pad"
                />
                <HelperText type="error" visible={!!errors.phone}>
                    {errors.phone}
                </HelperText>

                <TextInput
                    label="Email"
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    mode="outlined"
                    error={!!errors.email}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <HelperText type="error" visible={!!errors.email}>
                    {errors.email}
                </HelperText>

                <TextInput
                    label="Description"
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    mode="outlined"
                    error={!!errors.description}
                    style={styles.input}
                    multiline
                />
                <HelperText type="error" visible={!!errors.description}>
                    {errors.description}
                </HelperText>

                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    style={styles.button}
                >
                    {business ? 'Update' : 'Create'}
                </Button>
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
    button: {
        marginTop: 16,
        marginBottom: 32,
    },
});

export default BusinessFormScreen; 