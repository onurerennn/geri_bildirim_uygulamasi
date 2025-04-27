import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton, useTheme } from 'react-native-paper';
import { ActivityIndicator, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/UserRole';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Business Admin Screens
import BusinessDashboardScreen from '../screens/main/BusinessDashboardScreen';
// Using require instead of import for SurveyDetailScreen
const SurveyDetailScreen = require('../screens/main/SurveyDetailScreen').default;
import CreateSurveyScreen from '../screens/main/CreateSurveyScreen';
import QRCodeScreen from '../screens/main/QRCodeScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Customer Screens
import HomeScreen from '../screens/main/HomeScreen';
import QRScannerScreen from '../screens/main/QRScannerScreen';
import SurveyResponseScreen from '../screens/main/SurveyResponseScreen';
import RewardsScreen from '../screens/main/RewardsScreen';

// Define the ParamList for type safety
export type MainStackParamList = {
    Login: undefined;
    Register: undefined;
    BusinessMain: undefined;
    CustomerMain: undefined;
    SurveyDetail: { surveyId: string };
    CreateSurvey: undefined;
    QRCode: { surveyId: string };
    SurveyResponse: { surveyId: string; qrCode?: string };
};

const Stack = createStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator();

const BusinessTabNavigator = () => {
    const theme = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: 'gray',
                tabBarLabelStyle: { fontSize: 12 },
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={BusinessDashboardScreen}
                options={{
                    tabBarLabel: 'Ana Sayfa',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profil',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const CustomerTabNavigator = () => {
    const theme = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: 'gray',
                tabBarLabelStyle: { fontSize: 12 },
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Ana Sayfa',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="ScanQR"
                component={QRScannerScreen}
                options={{
                    tabBarLabel: 'QR Tara',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="qrcode-scan" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Rewards"
                component={RewardsScreen}
                options={{
                    tabBarLabel: 'Ödüller',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="gift" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profil',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const MainStack = () => {
    const { user, loading } = useAuth();
    const theme = useTheme();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: theme.colors.primary,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            {!user ? (
                // Auth Stack
                <>
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ title: 'Giriş Yap' }}
                    />
                    <Stack.Screen
                        name="Register"
                        component={RegisterScreen}
                        options={{ title: 'Kayıt Ol' }}
                    />
                </>
            ) : (
                // Main Stack based on user role
                <>
                    {user.role === UserRole.BUSINESS_ADMIN ? (
                        // Business Admin Screens
                        <>
                            <Stack.Screen
                                name="BusinessMain"
                                component={BusinessTabNavigator}
                                options={{
                                    headerTitle: 'İşletme Paneli',
                                    headerRight: () => (
                                        <IconButton
                                            icon="plus"
                                            iconColor="white"
                                            onPress={() => { }}
                                        />
                                    ),
                                }}
                            />
                            <Stack.Screen
                                name="SurveyDetail"
                                component={SurveyDetailScreen}
                                options={{ title: 'Anket Detayları' }}
                            />
                            <Stack.Screen
                                name="CreateSurvey"
                                component={CreateSurveyScreen}
                                options={{ title: 'Anket Oluştur' }}
                            />
                            <Stack.Screen
                                name="QRCode"
                                component={QRCodeScreen}
                                options={{ title: 'QR Kod' }}
                            />
                        </>
                    ) : (
                        // Customer Screens
                        <>
                            <Stack.Screen
                                name="CustomerMain"
                                component={CustomerTabNavigator}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="SurveyResponse"
                                component={SurveyResponseScreen}
                                options={{ title: 'Anketi Doldur' }}
                            />
                        </>
                    )}
                </>
            )}
        </Stack.Navigator>
    );
};

export default MainStack; 